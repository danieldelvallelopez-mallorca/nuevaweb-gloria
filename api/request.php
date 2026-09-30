<?php
/* Solicitudes de servicios desde la web (mesa en El Patio, spa, traslados, sorpresas, check-out tardío…).
   NO es disponibilidad en tiempo real: el cliente envía una SOLICITUD y el equipo la confirma después.
   - El catálogo y sus reglas (días cerrados, antelación, horas, personas, campos extra, habitación)
     están en ../data/services.json: la misma fuente que usa la web (js/requests.js, js/guest.js).
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
const REQUEST_CATALOG = __DIR__ . '/../data/services.json';
const REQUEST_LANGS = ['es', 'en', 'de', 'fr', 'sv'];
const HOTEL_ROOMS = ['101', '102', '103', '104', '105', '106', '107', '201', '202', '203', '204', '205', '206', '207'];

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

/** Texto libre de un campo extra: sin caracteres de control, recortado y de como mucho $max caracteres. */
function request_clean_text($v, int $max): string {
    if (!is_scalar($v)) return '';
    $s = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)$v);
    if (!is_string($s)) return '';                                   // UTF-8 no válido
    return trim(mb_substr(trim($s), 0, $max));
}

/** Catálogo de servicios activos, indexado por id. Null si el JSON falta o no es válido. */
function request_catalog(): ?array {
    $raw = @file_get_contents(REQUEST_CATALOG);
    if ($raw === false) return null;
    $c = json_decode($raw, true);
    if (!is_array($c) || !is_array($c['services'] ?? null)) return null;
    $byId = [];
    foreach ($c['services'] as $s) {
        if (is_array($s) && is_string($s['id'] ?? null) && ($s['active'] ?? true) !== false) $byId[$s['id']] = $s;
    }
    return $byId;
}

/** "HH:MM" → minutos desde medianoche, o null. */
function request_minutes(string $hhmm): ?int {
    if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $hhmm, $m)) return null;
    return (int)$m[1] * 60 + (int)$m[2];
}

/** Hora válida para el servicio: dentro de from..to y en la rejilla de 'step' minutos desde 'from'. */
function request_time_ok(array $svcTime, string $time): bool {
    $mins = request_minutes($time);
    $from = request_minutes((string)($svcTime['from'] ?? ''));
    $to = request_minutes((string)($svcTime['to'] ?? ''));
    $step = (int)($svcTime['step'] ?? 0);
    if ($mins === null || $from === null || $to === null || $step < 1) return false;
    return $mins >= $from && $mins <= $to && ($mins - $from) % $step === 0;
}

/** Destinatarios del aviso interno: los de gloria-secrets.php ('requests_to') o reservas@. */
function request_recipients(array $cfg): array {
    $list = is_array($cfg['requests_to'] ?? null) && $cfg['requests_to'] ? $cfg['requests_to'] : REQUESTS_TO;
    return array_values(array_unique(array_filter($list, fn($a) => is_string($a) && filter_var($a, FILTER_VALIDATE_EMAIL))));
}

/**
 * Valida los campos extra del servicio. Devuelve [valores (nombre => valor crudo), detalles en español
 * (etiqueta ES => opción ES / texto / número)] o termina con 400.
 */
function request_extra_fields(array $svc, array $in): array {
    $given = is_array($in['fields'] ?? null) ? $in['fields'] : [];
    $values = [];
    $details = [];
    foreach (($svc['fields'] ?? []) as $f) {
        if (!is_array($f) || !is_string($f['name'] ?? null)) continue;
        $name = $f['name'];
        $raw = $given[$name] ?? ($in[$name] ?? '');                  // compatibilidad: 'treatment' suelto (requests.js antiguo)
        $required = !empty($f['required']);
        $type = (string)($f['type'] ?? 'text');
        $label = (string)($f['label']['es'] ?? $name);
        $code = $name === 'treatment' ? 'treatment' : 'fields';

        if ($type === 'select') {
            $v = is_scalar($raw) ? trim((string)$raw) : '';
            if ($v === '') { if ($required) out(400, ['error' => $code, 'field' => $name]); continue; }
            $opt = null;
            foreach (($f['options'] ?? []) as $o) {
                if (is_array($o) && (string)($o['value'] ?? '') === $v) { $opt = $o; break; }
            }
            if ($opt === null) out(400, ['error' => $code, 'field' => $name]);
            $values[$name] = $v;
            $details[$label] = (string)($opt['label']['es'] ?? $v);
        } elseif ($type === 'number') {
            $v = is_scalar($raw) ? trim((string)$raw) : '';
            if ($v === '') { if ($required) out(400, ['error' => $code, 'field' => $name]); continue; }
            if (!preg_match('/^-?\d{1,6}$/', $v)) out(400, ['error' => $code, 'field' => $name]);
            $n = (int)$v;
            if ((isset($f['min']) && $n < (int)$f['min']) || (isset($f['max']) && $n > (int)$f['max'])) out(400, ['error' => $code, 'field' => $name]);
            $values[$name] = $n;
            $details[$label] = $n;
        } else {
            $v = request_clean_text($raw, max(1, (int)($f['max'] ?? 120)));
            if ($v === '') { if ($required) out(400, ['error' => $code, 'field' => $name]); continue; }
            $values[$name] = $v;
            $details[$label] = $v;
        }
    }
    return [$values, $details];
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

$catalog = request_catalog();
if ($catalog === null) {
    error_log('gloria requests: no se puede leer data/services.json');
    out(500, ['error' => 'config']);
}

$kind = field($in, 'kind', 40);
$date = field($in, 'date', 10);
$time = field($in, 'time', 5);
$paxRaw = field($in, 'pax', 3);
$name = field($in, 'name', 120);
$phone = field($in, 'phone', 40);
$email = field($in, 'email', 160);
$notes = field($in, 'notes', 600);
$room = field($in, 'room', 3);
$consent = field($in, 'consent', 5) === '1' || ($in['consent'] ?? null) === true;
$langIn = field($in, 'lang', 2);
$lang = in_array($langIn, REQUEST_LANGS, true) ? $langIn : 'en';

$svc = $catalog[$kind] ?? null;
if ($svc === null || $name === '') out(400, ['error' => 'fields']);
// mismas reglas que la tabla `requests` de Supabase (si no, la fila se rechazaría allí)
if ($phone !== '' && !preg_match('/^[0-9+() .\/\-]{6,40}$/', $phone)) out(400, ['error' => 'phone']);
if ($email !== '' && (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[?&=<>"\']/', $email))) out(400, ['error' => 'email']);
if ($phone === '' && $email === '') out(400, ['error' => 'contact']);
// habitación: obligatoria en los servicios solo para alojados (stayOnly); opcional en el resto
if ($room === '' && !empty($svc['stayOnly'])) out(400, ['error' => 'roomReq']);
if ($room !== '' && (!preg_match('/^\d{3}$/', $room) || !in_array($room, HOTEL_ROOMS, true))) out(400, ['error' => 'room']);
if (!$consent) out(400, ['error' => 'consent']);

// fecha: hoy .. +180 días (hora de Palma), sin los días de descanso del servicio (ISO-8601 'N': 1 = lunes … 7 = domingo)
$tz = new DateTimeZone(REQUEST_TZ);
$now = new DateTimeImmutable('now', $tz);
$day = DateTimeImmutable::createFromFormat('!Y-m-d', $date, $tz);
if (!$day || $day->format('Y-m-d') !== $date) out(400, ['error' => 'date']);
$today = $now->setTime(0, 0);
if ($day < $today || $day > $today->modify('+' . REQUEST_MAX_DAYS . ' days')) out(400, ['error' => 'date']);
$closed = array_map('intval', is_array($svc['date']['closedWeekdays'] ?? null) ? $svc['date']['closedWeekdays'] : []);
if (in_array((int)$day->format('N'), $closed, true)) out(400, ['error' => 'closed']);

// hora: obligatoria si el servicio la tiene (en su rejilla); si no, no se guarda
$leadHours = max(0, (int)($svc['leadHours'] ?? 0));
$earliest = $now->modify('+' . $leadHours . ' hours');
$svcTime = is_array($svc['time'] ?? null) ? $svc['time'] : null;
if ($svcTime !== null) {
    if (!request_time_ok($svcTime, $time)) out(400, ['error' => 'time']);
    [$hh, $mm] = array_map('intval', explode(':', $time));
    $at = $day->setTime($hh, $mm);
    if ($at <= $now) out(400, ['error' => 'time']);
    if ($at < $earliest) out(400, ['error' => 'lead']);
} else {
    $time = '';
    if ($day->modify('+1 day') <= $earliest) out(400, ['error' => 'lead']);   // sin hora: tiene que quedar parte del día
}

// personas: dentro del rango del servicio; sin campo de personas se guarda 1
$svcPax = is_array($svc['pax'] ?? null) ? $svc['pax'] : null;
$pax = 1;
if ($svcPax !== null) {
    $paxMin = max(1, (int)($svcPax['min'] ?? 1));
    $paxMax = max($paxMin, (int)($svcPax['max'] ?? $paxMin));
    if (!ctype_digit($paxRaw) || (int)$paxRaw < $paxMin || (int)$paxRaw > $paxMax) out(400, ['error' => 'pax']);
    $pax = (int)$paxRaw;
}

[$values, $details] = request_extra_fields($svc, $in);
$title = (string)($svc['title']['es'] ?? $kind);

$record = [
    'kind' => $kind, 'service' => $svc, 'title' => $title, 'date' => $date, 'time' => $time,
    'pax' => $pax, 'values' => $values, 'name' => $name, 'phone' => $phone, 'email' => $email,
    'notes' => $notes, 'lang' => $lang, 'room' => $room,
];

$cfg = gloria_secrets();

$stored = request_store([
    'kind' => $kind, 'title' => $title, 'details' => (object)$details, 'source' => 'web',
    'req_date' => $date, 'req_time' => $time !== '' ? $time : null, 'pax' => $pax,
    'name' => $name, 'phone' => $phone ?: null, 'email' => $email ?: null,
    'notes' => $notes ?: null, 'lang' => $lang, 'room' => $room !== '' ? $room : null, 'treatment' => null,
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
