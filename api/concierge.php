<?php
/* Endpoint del concierge de la web: POST JSON {lang, today, messages[]} → {reply, action}.
   Sin clave de IA configurada devuelve 503 y la web usa sus respuestas guiadas. */
require __DIR__ . '/lib/brain.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function out(int $code, array $body): void { http_response_code($code); echo json_encode($body, JSON_UNESCAPED_UNICODE); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['error' => 'method']);

// solo desde nuestras páginas
$allowed = ['web.hotelgloria.es', 'nuevaweb.hotelgloria.es', 'hotelgloria.es', 'www.hotelgloria.es', 'localhost'];
$origin = parse_url($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''), PHP_URL_HOST);
if (!$origin || !in_array($origin, $allowed, true)) out(403, ['error' => 'origin']);

$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0');
if (!gloria_rate_ok('web:' . $ip, 20, 600)) out(429, ['error' => 'rate']);

$raw = file_get_contents('php://input', false, null, 0, 20000);
$in = json_decode($raw ?: '', true);
if (!is_array($in)) out(400, ['error' => 'json']);

$langIn = $in['lang'] ?? '';
$lang = is_string($langIn) && preg_match('/^[a-z]{2}$/', $langIn) ? $langIn : 'en';
$todayIn = $in['today'] ?? '';
$today = is_string($todayIn) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $todayIn) ? $todayIn : date('Y-m-d');
$messages = gloria_clean_history($in['messages'] ?? []);
if (!$messages) out(400, ['error' => 'empty']);

$res = gloria_ask($messages, $lang, $today, 'website chat');
if (!$res) out(503, ['error' => 'unavailable']);
out(200, $res);
