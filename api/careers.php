<?php
/* Trabaja con nosotros: recibe una candidatura (multipart/form-data) con el CV adjunto.
   - Guarda el CV y la ficha FUERA de public_html, en gloria-data/cv/ (nunca accesible por URL).
   - Avisa por email, con el CV adjunto, al director del hotel elegido (y a RR. HH. cuando se configure).
   - Borra solo las candidaturas de más de 12 meses (plazo indicado en la web y en la política de privacidad). */
require __DIR__ . '/lib/brain.php';
require __DIR__ . '/lib/mailer.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

const CV_MAX_BYTES = 5 * 1024 * 1024;
const CV_RETENTION_DAYS = 365;
const CV_TYPES = [
    'application/pdf' => 'pdf',
    'application/msword' => 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
];
const HOTELS = ['gloria' => 'Glòria de Sant Jaume · Palma', 'any-cabau' => 'Cualquier hotel de Cabau Hotels', 'other' => 'Otro hotel de Cabau Hotels'];
// A quién llega cada candidatura según el hotel elegido. De momento todo va al director del Glòria;
// más adelante, el director de cada hotel + RR. HH. ('careers_routes' y 'careers_hr' en gloria-secrets.php lo sobrescriben).
const ROUTES = [
    'gloria'    => ['director@gloriasantjaume.com'],
    'any-cabau' => ['director@gloriasantjaume.com'],
    'other'     => ['director@gloriasantjaume.com'],
];
const AREAS = ['reception' => 'Recepción', 'housekeeping' => 'Pisos', 'kitchen' => 'Cocina', 'dining' => 'Sala y bar',
    'spa' => 'Spa', 'maintenance' => 'Mantenimiento', 'sales' => 'Ventas, eventos y marketing', 'admin' => 'Administración', 'other' => 'Otra'];

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
function field(string $k, int $max): string { return trim(mb_substr(str_replace(["\r", "\0"], '', (string)($_POST[$k] ?? '')), 0, $max)); }

/** Destinatarios del aviso: los del hotel elegido + RR. HH., solo direcciones válidas y sin repetir. */
function recipients(string $hotel, array $cfg): array {
    $routes = is_array($cfg['careers_routes'] ?? null) ? $cfg['careers_routes'] + ROUTES : ROUTES;
    $hr = is_array($cfg['careers_hr'] ?? null) ? $cfg['careers_hr'] : [];
    $all = array_merge((array)($routes[$hotel] ?? []), $hr);
    return array_values(array_unique(array_filter($all, fn($a) => is_string($a) && filter_var($a, FILTER_VALIDATE_EMAIL))));
}

/** Aviso al director / RR. HH. con el CV adjunto. */
function notify(array $to, array $record, string $cvFile, string $mime, array $cfg): bool {
    $body = "Nueva candidatura desde la web

"
        . "Nombre: {$record['name']}
Email: {$record['email']}
Teléfono: {$record['phone']}
"
        . "Hotel: {$record['hotel']}
Área: {$record['area']}
"
        . 'Compartir con el grupo: ' . ($record['share_with_group'] ? 'sí' : 'no') . "

"
        . "Mensaje:
{$record['message']}

"
        . "Conservar hasta: {$record['delete_after']} (después se borra automáticamente del servidor).
";
    $safeName = preg_replace('/[^\p{L}\p{N} ._-]/u', '', $record['name']);
    $att = ['name' => "CV-{$record['id']}." . CV_TYPES[$mime], 'type' => $mime, 'data' => (string)file_get_contents($cvFile)];
    return gloria_send_mail($to, "Candidatura · {$record['hotel']} · {$record['area']} · $safeName", $body, $record['email'], $att, $cfg);
}

/** Acuse de recibo al candidato, en el idioma en que ha rellenado el formulario. */
function confirm_candidate(array $record, string $lang, array $cfg): bool {
    $t = [
        'es' => ['Hemos recibido tu candidatura · Glòria de Sant Jaume', "Hola {n},

Gracias por tu interés en formar parte de Glòria de Sant Jaume. Hemos recibido tu candidatura y tu currículum.

Lo tendremos en cuenta para los procesos de selección actuales y futuros, y nos pondremos en contacto contigo si surge una vacante adecuada. Conservaremos tus datos durante 12 meses; puedes pedirnos que los borremos en cualquier momento respondiendo a este email.

Un saludo,
Glòria de Sant Jaume · Palma"],
        'en' => ['We have received your application · Glòria de Sant Jaume', "Hello {n},

Thank you for your interest in joining Glòria de Sant Jaume. We have received your application and your CV.

We will keep it in mind for current and future selection processes and will be in touch if there is a suitable opening. We keep your data for 12 months; you can ask us to delete it at any time by replying to this email.

Kind regards,
Glòria de Sant Jaume · Palma"],
        'de' => ['Wir haben Ihre Bewerbung erhalten · Glòria de Sant Jaume', "Hallo {n},

vielen Dank für Ihr Interesse an Glòria de Sant Jaume. Wir haben Ihre Bewerbung und Ihren Lebenslauf erhalten.

Wir berücksichtigen sie für aktuelle und künftige Auswahlverfahren und melden uns, wenn eine passende Stelle frei wird. Wir bewahren Ihre Daten 12 Monate auf; Sie können jederzeit die Löschung verlangen, indem Sie auf diese E-Mail antworten.

Mit freundlichen Grüßen
Glòria de Sant Jaume · Palma"],
        'fr' => ['Nous avons bien reçu votre candidature · Glòria de Sant Jaume', "Bonjour {n},

Merci de votre intérêt pour Glòria de Sant Jaume. Nous avons bien reçu votre candidature et votre CV.

Nous en tiendrons compte pour nos recrutements actuels et futurs et vous contacterons si un poste adapté se présente. Nous conservons vos données pendant 12 mois ; vous pouvez demander leur suppression à tout moment en répondant à cet e-mail.

Bien cordialement,
Glòria de Sant Jaume · Palma"],
        'sv' => ['Vi har tagit emot din ansökan · Glòria de Sant Jaume', "Hej {n},

Tack för ditt intresse för Glòria de Sant Jaume. Vi har tagit emot din ansökan och ditt CV.

Vi har den i åtanke för nuvarande och framtida rekryteringar och hör av oss om en passande tjänst dyker upp. Vi sparar dina uppgifter i 12 månader; du kan när som helst be oss radera dem genom att svara på detta e-postmeddelande.

Vänliga hälsningar
Glòria de Sant Jaume · Palma"],
    ];
    [$subject, $text] = $t[$lang] ?? $t['en'];
    $first = preg_split('/\s+/', $record['name'])[0] ?? '';
    $replyTo = recipients_reply($cfg);
    return gloria_send_mail([$record['email']], $subject, str_replace('{n}', $first, $text), $replyTo, null, $cfg);
}

/** A dónde responde el candidato: al primer destinatario del Glòria (el director). */
function recipients_reply(array $cfg): ?string {
    $r = recipients('gloria', $cfg);
    return $r[0] ?? null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'method']);

// solo desde nuestras páginas
$allowed = ['web.hotelgloria.es', 'web2.hotelgloria.es', 'nuevaweb.hotelgloria.es', 'hotelgloria.es', 'www.hotelgloria.es', 'localhost'];
$origin = parse_url($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''), PHP_URL_HOST);
if (!$origin || !in_array($origin, $allowed, true)) out(403, ['error' => 'origin']);

$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0');
if (!gloria_rate_ok('careers:' . $ip, 5, 3600)) out(429, ['error' => 'rate']);

// campo trampa para bots: si viene relleno, se responde "ok" sin guardar nada
if (field('website', 200) !== '') out(200, ['ok' => true]);

$name = field('name', 120);
$email = field('email', 160);
$phone = field('phone', 40);
$hotel = field('hotel', 20);
$area = field('area', 20);
$message = field('message', 1500);
$consent = ($_POST['consent'] ?? '') === '1';
$share = ($_POST['share'] ?? '') === '1';
$lang = in_array(field('lang', 2), ['es', 'en', 'de', 'fr', 'sv'], true) ? field('lang', 2) : 'en';

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || !isset(HOTELS[$hotel]) || !isset(AREAS[$area])) out(400, ['error' => 'fields']);
if (!$consent) out(400, ['error' => 'consent']);

// CV: tamaño, subida correcta y tipo real del fichero (no el que dice el navegador)
$f = $_FILES['cv'] ?? null;
if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) out(400, ['error' => 'file']);
if ($f['size'] <= 0 || $f['size'] > CV_MAX_BYTES) out(400, ['error' => 'file']);
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']) ?: '';
if ($mime === 'application/zip' && preg_match('/\.docx$/i', (string)$f['name'])) {
    $mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';   // algunos servidores ven los .docx como zip
}
if (!isset(CV_TYPES[$mime])) out(400, ['error' => 'file']);

// carpeta privada (un nivel por encima de public_html), sin listado ni acceso web
$dir = dirname(__DIR__, 2) . '/gloria-data/cv';
if (!is_dir($dir) && !@mkdir($dir, 0700, true)) { error_log('gloria careers: no se puede crear la carpeta de CV'); out(500, ['error' => 'storage']); }

// limpieza: fuera lo que supera el plazo de conservación
foreach (glob($dir . '/*') ?: [] as $old) {
    if (is_file($old) && filemtime($old) < time() - CV_RETENTION_DAYS * 86400) @unlink($old);
}

$id = date('Ymd-His') . '-' . bin2hex(random_bytes(4));
$cvFile = "$dir/$id." . CV_TYPES[$mime];
if (!move_uploaded_file($f['tmp_name'], $cvFile)) { error_log('gloria careers: fallo al guardar el CV'); out(500, ['error' => 'storage']); }
@chmod($cvFile, 0600);

$record = [
    'id' => $id, 'received' => date('c'), 'name' => $name, 'email' => $email, 'phone' => $phone,
    'hotel' => HOTELS[$hotel], 'area' => AREAS[$area], 'message' => $message,
    'consent' => true, 'share_with_group' => $share, 'cv' => basename($cvFile),
    'delete_after' => date('Y-m-d', time() + CV_RETENTION_DAYS * 86400),
];
if (@file_put_contents("$dir/$id.json", json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX) === false) {
    @unlink($cvFile);
    error_log('gloria careers: fallo al guardar la ficha');
    out(500, ['error' => 'storage']);
}
@chmod("$dir/$id.json", 0600);

$cfg = gloria_secrets();
$to = recipients($hotel, $cfg);
$notified = $to ? notify($to, $record, $cvFile, $mime, $cfg) : false;
if ($to && !$notified) error_log("gloria careers: no se pudo enviar el aviso de $id");
$confirmed = confirm_candidate($record, $lang, $cfg);
if (!$confirmed) error_log("gloria careers: no se pudo enviar el acuse al candidato de $id");

out(200, ['ok' => true, 'notified' => $notified, 'confirmed' => $confirmed]);
