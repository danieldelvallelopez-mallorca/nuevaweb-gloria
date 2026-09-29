<?php
/* Solicitudes de mesa (El Patio) y de tratamiento (Spa by Eric) desde la web.
   NO es disponibilidad en tiempo real: el cliente envía una SOLICITUD y el equipo la confirma después.
   - Guarda la solicitud en Supabase (tabla `requests`) si gloria-secrets.php trae 'supabase_url' y 'supabase_anon_key'.
   - Avisa por email a reservas (o a 'requests_to' de gloria-secrets.php), con Reply-To al cliente.
   - Envía al cliente un acuse en su idioma: "hemos recibido su solicitud, aún no es una confirmación". */
require __DIR__ . '/lib/brain.php';
require __DIR__ . '/lib/mailer.php';
require __DIR__ . '/lib/requests-mail.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

const REQUESTS_TO = ['reservas@gloriasantjaume.com'];
const REQUEST_TZ = 'Europe/Madrid';
const REQUEST_MAX_DAYS = 180;
const REQUEST_BODY_MAX = 16384;
const RESTAURANT_CLOSED_DAYS = [2, 3];        // ISO-8601 'N': 2 = martes, 3 = miércoles (El Patio descansa)
const RESTAURANT_PAX_MAX = 10;
const SPA_PAX_MAX = 2;
const HOTEL_ROOMS = ['101', '102', '103', '104', '105', '106', '107', '201', '202', '203', '204', '205', '206', '207'];
const SPA_TREATMENTS = [
    'sports-60'          => 'Sports massage · 60 min · 120 €',
    'relaxing-60'        => 'Relaxing massage · 60 min · 120 €',
    'lymphatic-60'       => 'Lymphatic drainage · 60 min · 120 €',
    'reflexology-60'     => 'Reflexology & craniosacral · 60 min · 120 €',
    'pregnancy-60'       => 'Pregnancy massage · 60 min · 120 €',
    'ayurvedic-90'       => 'Ayurvedic massage · 90 min · 250 €',
    'lomilomi-90'        => 'Lomi Lomi · 90 min · 250 €',
    'inka-90'            => 'Inka energetic massage · 90 min · 220 €',
    'facial-kobido-50'   => 'Facial & Kobido · 50 min · 190 €',
    'ritual-olive-90'    => 'Ritual · The Power of the Olive Tree · 90 min · 230 €',
    'ritual-lavender-90' => 'Ritual · Lavender Garden · 90 min · 230 €',
    'ritual-coconut-90'  => 'Ritual · Organic Coconut · 90 min · 230 €',
];

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }

/** Datos de entrada: JSON o formulario. */
function request_input(): array {
    $ctype = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    if (strpos($ctype, 'application/json') !== false) {
        $raw = (string)file_get_contents('php://input', false, null, 0, REQUEST_BODY_MAX + 1);
        if (strlen($raw) > REQUEST_BODY_MAX) out(413, ['error' => 'size']);
        $j = json_decode($raw, true);
        return is_array($j) ? $j : [];
    }
    return $_POST;
}

function field(array $in, string $k, int $max): string {
    $v = $in[$k] ?? '';
    if (!is_scalar($v)) return '';
    return trim(mb_substr(str_replace(["\r", "\0"], '', (string)$v), 0, $max));
}

/** Destinatarios del aviso interno: los de gloria-secrets.php ('requests_to') o reservas@. */
function request_recipients(array $cfg): array {
    $list = is_array($cfg['requests_to'] ?? null) && $cfg['requests_to'] ? $cfg['requests_to'] : REQUESTS_TO;
    return array_values(array_unique(array_filter($list, fn($a) => is_string($a) && filter_var($a, FILTER_VALIDATE_EMAIL))));
}

/** Franja horaria válida: restaurante 19:00–22:30 cada media hora; spa 10:00–20:00 en punto. */
function request_time_ok(string $kind, string $time): bool {
    if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $time, $m)) return false;
    $mins = (int)$m[1] * 60 + (int)$m[2];
    if ($kind === 'restaurant') return $mins >= 19 * 60 && $mins <= 22 * 60 + 30 && (int)$m[2] % 30 === 0;
    return $mins >= 10 * 60 && $mins <= 20 * 60 && (int)$m[2] === 0;
}

/** Inserta la solicitud en Supabase (REST). Devuelve false si no está configurado o falla; nunca registra datos personales. */
function request_store(array $row, array $cfg): bool {
    $url = rtrim((string)($cfg['supabase_url'] ?? ''), '/');
    $key = (string)($cfg['supabase_anon_key'] ?? '');
    if ($url === '' || $key === '' || !function_exists('curl_init')) return false;
    $ch = curl_init($url . '/rest/v1/requests');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($row, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
            'Prefer: return=minimal',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_errno($ch);
    curl_close($ch);
    if ($res === false || $code < 200 || $code >= 300) {
        error_log("gloria requests: fallo al guardar en Supabase (http $code, curl $err)");
        return false;
    }
    return true;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'method']);

// solo desde nuestras páginas
$allowed = ['web.hotelgloria.es', 'web2.hotelgloria.es', 'nuevaweb.hotelgloria.es', 'hotelgloria.es', 'www.hotelgloria.es', 'localhost'];
$origin = parse_url($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''), PHP_URL_HOST);
if (!$origin || !in_array($origin, $allowed, true)) out(403, ['error' => 'origin']);

$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0');
if (!gloria_rate_ok('requests:' . $ip, 5, 3600)) out(429, ['error' => 'rate']);

$in = request_input();

// campo trampa para bots: si viene relleno, se responde "ok" sin hacer nada
if (field($in, 'website', 200) !== '') out(200, ['ok' => true, 'stored' => false, 'notified' => false, 'confirmed' => false]);

$kind = field($in, 'kind', 20);
$date = field($in, 'date', 10);
$time = field($in, 'time', 5);
$paxRaw = field($in, 'pax', 3);
$treatmentKey = field($in, 'treatment', 40);
$name = field($in, 'name', 120);
$phone = field($in, 'phone', 40);
$email = field($in, 'email', 160);
$notes = field($in, 'notes', 600);
$room = field($in, 'room', 3);                // opcional: huéspedes alojados en el hotel
$consent = field($in, 'consent', 5) === '1' || ($in['consent'] ?? null) === true;
$lang = in_array(field($in, 'lang', 2), ['es', 'en', 'de', 'fr', 'sv'], true) ? field($in, 'lang', 2) : 'en';

if (!in_array($kind, ['restaurant', 'spa'], true) || $name === '') out(400, ['error' => 'fields']);
// mismas reglas que la tabla `requests` de Supabase (si no, la fila se rechazaría allí)
if ($phone !== '' && !preg_match('/^[0-9+() .\/\-]{6,40}$/', $phone)) out(400, ['error' => 'phone']);
if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[?&=<>"\']/', $email))) out(400, ['error' => 'email']);
if ($phone === '' && $email === '') out(400, ['error' => 'contact']);
if ($room !== '' && (!preg_match('/^\d{3}$/', $room) || !in_array($room, HOTEL_ROOMS, true))) out(400, ['error' => 'room']);
if (!$consent) out(400, ['error' => 'consent']);

// fecha: hoy .. +180 días (hora de Palma)
$tz = new DateTimeZone(REQUEST_TZ);
$now = new DateTimeImmutable('now', $tz);
$day = DateTimeImmutable::createFromFormat('!Y-m-d', $date, $tz);
if (!$day || $day->format('Y-m-d') !== $date) out(400, ['error' => 'date']);
$today = $now->setTime(0, 0);
if ($day < $today || $day > $today->modify('+' . REQUEST_MAX_DAYS . ' days')) out(400, ['error' => 'date']);
if ($kind === 'restaurant' && in_array((int)$day->format('N'), RESTAURANT_CLOSED_DAYS, true)) out(400, ['error' => 'closed']);

if (!request_time_ok($kind, $time)) out(400, ['error' => 'time']);
[$hh, $mm] = array_map('intval', explode(':', $time));
if ($day->setTime($hh, $mm) <= $now) out(400, ['error' => 'time']);

$paxMax = $kind === 'restaurant' ? RESTAURANT_PAX_MAX : SPA_PAX_MAX;
if (!ctype_digit($paxRaw) || (int)$paxRaw < 1 || (int)$paxRaw > $paxMax) out(400, ['error' => 'pax']);
$pax = (int)$paxRaw;

$treatment = null;
if ($kind === 'spa') {
    if (!isset(SPA_TREATMENTS[$treatmentKey])) out(400, ['error' => 'treatment']);
    $treatment = SPA_TREATMENTS[$treatmentKey];
}

$record = [
    'kind' => $kind, 'date' => $date, 'time' => $time, 'pax' => $pax, 'treatment' => $treatment,
    'name' => $name, 'phone' => $phone, 'email' => $email, 'notes' => $notes, 'lang' => $lang, 'room' => $room,
];

$cfg = gloria_secrets();

$stored = request_store([
    'kind' => $kind, 'source' => 'web', 'req_date' => $date, 'req_time' => $time, 'pax' => $pax,
    'treatment' => $treatment, 'name' => $name, 'phone' => $phone ?: null, 'email' => $email ?: null,
    'notes' => $notes ?: null, 'lang' => $lang, 'room' => $room !== '' ? $room : null,
], $cfg);

$to = request_recipients($cfg);
$notified = false;
if ($to) {
    [$subject, $text, $html, $inline] = requests_internal_mail($record);
    $notified = gloria_send_mail($to, $subject, ['text' => $text, 'html' => $html], $email ?: null, [], $inline, $cfg);
    if (!$notified) error_log("gloria requests: no se pudo enviar el aviso interno ($kind $date)");
}

$confirmed = false;
if ($email !== '') {
    [$subject, $text, $html, $inline] = requests_guest_mail($record, $lang);
    $confirmed = gloria_send_mail([$email], $subject, ['text' => $text, 'html' => $html], $to[0] ?? null, [], $inline, $cfg);
    if (!$confirmed) error_log("gloria requests: no se pudo enviar el acuse al cliente ($kind $date)");
}

// si no se ha podido ni guardar ni avisar al equipo, la solicitud se perdería: se lo decimos al cliente
if (!$stored && !$notified) out(502, ['error' => 'delivery', 'stored' => false, 'notified' => false, 'confirmed' => $confirmed]);

out(200, ['ok' => true, 'stored' => $stored, 'notified' => $notified, 'confirmed' => $confirmed]);
