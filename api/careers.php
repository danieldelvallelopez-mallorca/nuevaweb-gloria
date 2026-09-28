<?php
/* Trabaja con nosotros: recibe una candidatura (multipart/form-data) con el CV adjunto.
   - Guarda el CV y la ficha FUERA de public_html, en gloria-data/cv/ (nunca accesible por URL).
   - Si gloria-secrets.php tiene 'careers_to', avisa por email a RR. HH. con el CV adjunto.
   - Borra solo las candidaturas de más de 12 meses (plazo indicado en la web y en la política de privacidad). */
require __DIR__ . '/lib/brain.php';

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
const AREAS = ['reception' => 'Recepción', 'housekeeping' => 'Pisos', 'kitchen' => 'Cocina', 'dining' => 'Sala y bar',
    'spa' => 'Spa', 'maintenance' => 'Mantenimiento', 'sales' => 'Ventas, eventos y marketing', 'admin' => 'Administración', 'other' => 'Otra'];

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }
function field(string $k, int $max): string { return trim(mb_substr(str_replace(["\r", "\0"], '', (string)($_POST[$k] ?? '')), 0, $max)); }

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

// aviso por email a RR. HH. (opcional: solo si IT ha puesto la dirección en gloria-secrets.php)
$cfg = gloria_secrets();
$to = $cfg['careers_to'] ?? '';
if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
    $boundary = 'gloria-' . bin2hex(random_bytes(8));
    $safeName = preg_replace('/[^\p{L}\p{N} ._-]/u', '', $name);
    $body = "Nueva candidatura desde la web\n\n"
        . "Nombre: $name\nEmail: $email\nTeléfono: $phone\nHotel: {$record['hotel']}\nÁrea: {$record['area']}\n"
        . 'Compartir con el grupo: ' . ($share ? 'sí' : 'no') . "\n\nMensaje:\n$message\n\n"
        . "Conservar hasta: {$record['delete_after']} (después se borra automáticamente).\n";
    $msg = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($body))
        . "--$boundary\r\nContent-Type: $mime; name=\"CV-$id." . CV_TYPES[$mime] . "\"\r\nContent-Transfer-Encoding: base64\r\n"
        . "Content-Disposition: attachment; filename=\"CV-$id." . CV_TYPES[$mime] . "\"\r\n\r\n"
        . chunk_split(base64_encode((string)file_get_contents($cvFile))) . "--$boundary--";
    $from = $cfg['careers_from'] ?? 'no-reply@hotelgloria.es';
    $headers = "From: Glòria web <$from>\r\nReply-To: $email\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$boundary\"";
    $subject = '=?UTF-8?B?' . base64_encode("Candidatura · {$record['area']} · $safeName") . '?=';
    if (!@mail($to, $subject, $msg, $headers)) error_log("gloria careers: no se pudo enviar el aviso de $id");
}

out(200, ['ok' => true]);
