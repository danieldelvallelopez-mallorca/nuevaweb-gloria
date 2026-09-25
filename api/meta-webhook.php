<?php
/* Webhook de Meta: WhatsApp Business (Cloud API), Instagram y Messenger.
   GET  → verificación del webhook (hub.challenge).
   POST → mensaje entrante: se comprueba la firma, responde el mismo cerebro que la web.
   Configuración en gloria-secrets.php (fuera de public_html). Ver api/LEEME-IT.md. */
require __DIR__ . '/lib/brain.php';

$cfg = gloria_secrets();
$site = 'https://web.hotelgloria.es';
$graph = 'https://graph.facebook.com/' . ($cfg['meta_graph_version'] ?? 'v21.0');

/* ---------- 1. verificación del webhook ---------- */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['hub_mode'] ?? '') === 'subscribe' && !empty($cfg['meta_verify_token'])
        && hash_equals($cfg['meta_verify_token'], (string)($_GET['hub_verify_token'] ?? ''))) {
        echo (string)($_GET['hub_challenge'] ?? '');
        exit;
    }
    http_response_code(403); exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }

/* ---------- 2. firma de Meta (X-Hub-Signature-256) ---------- */
$raw = file_get_contents('php://input', false, null, 0, 200000) ?: '';
$sig = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
if (empty($cfg['meta_app_secret']) || !hash_equals('sha256=' . hash_hmac('sha256', $raw, $cfg['meta_app_secret']), $sig)) {
    http_response_code(403); exit;
}
http_response_code(200);                         // Meta reintenta si no recibe 200 rápido
echo 'ok';
// cerramos la conexión ya: lo que sigue (IA + Graph API) puede tardar más que el timeout de Meta
if (function_exists('fastcgi_finish_request')) { fastcgi_finish_request(); }
else { @ob_end_flush(); @flush(); }
$body = json_decode($raw, true) ?: [];

/* ---------- almacenamiento privado (fuera de la web): memoria corta y mensajes ya atendidos ---------- */
function data_dir(): string {
    $d = dirname(__DIR__, 2) . '/gloria-data';
    if (!is_dir($d)) @mkdir($d, 0700, true);
    return $d;
}
function seen(string $id): bool {                // evita responder dos veces al mismo mensaje
    $f = data_dir() . '/seen.txt';
    $ids = array_slice(@file($f, FILE_IGNORE_NEW_LINES) ?: [], -500);
    if (in_array($id, $ids, true)) return true;
    $ids[] = $id; @file_put_contents($f, implode("\n", $ids), LOCK_EX);
    return false;
}
function history_load(string $user): array {     // últimos 10 turnos, caducan a las 24 h
    $f = data_dir() . '/c-' . hash('sha256', $user) . '.json';
    $h = json_decode(@file_get_contents($f) ?: '[]', true) ?: [];
    return (time() - ($h['t'] ?? 0) > 86400) ? [] : ($h['m'] ?? []);
}
function history_save(string $user, array $m): void {
    @file_put_contents(data_dir() . '/c-' . hash('sha256', $user) . '.json', json_encode(['t' => time(), 'm' => array_slice($m, -10)], JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function action_link(string $action, string $site): string {
    $links = [
        'room'   => "\n\n" . $site . '/rooms.html',
        'dinner' => "\n\nhttps://elpatiodegloria.com/reservas.html",
        'music'  => "\n\n" . $site . '/el-patio.html#music',
        'spa'    => "\n\n" . $site . '/docs/spa-menu-2026.pdf',
        'where'  => "\n\nhttps://maps.google.com/?q=Hotel+Gl%C3%B2ria+de+Sant+Jaume+Palma",
        'human'  => "\n\n+34 971 92 18 91 · reservas@gloriasantjaume.com",
    ];
    return $links[$action] ?? '';
}

function answer(string $user, string $text, string $channel, string $site): string {
    if (!gloria_rate_ok('meta:' . $user, 15, 600)) return '';
    $h = history_load($user);
    $h[] = ['role' => 'user', 'content' => mb_substr($text, 0, 600)];
    $res = gloria_ask(gloria_clean_history($h), 'auto', date('Y-m-d'), $channel);
    if (!$res) {
        return "Glòria de Sant Jaume · Palma\n\nES · Reservar habitación: $site/rooms.html · Mesa en El Patio: https://elpatiodegloria.com/reservas.html · Tel. +34 971 92 18 91\n"
             . "EN · Book a room: $site/rooms.html · Table at El Patio: https://elpatiodegloria.com/reservas.html · Tel. +34 971 92 18 91";
    }
    $h[] = ['role' => 'assistant', 'content' => $res['reply']];
    history_save($user, $h);
    return $res['reply'] . action_link($res['action'], $site);
}

function graph_post(string $url, array $payload, string $token): void {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $token],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)]);
    $r = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    if ($code >= 300) error_log("gloria meta: envío http $code " . substr((string)$r, 0, 300));
}

/* ---------- 3a. WhatsApp Business (Cloud API) ---------- */
if (($body['object'] ?? '') === 'whatsapp_business_account' && !empty($cfg['wa_token'])) {
    foreach ($body['entry'] ?? [] as $entry) foreach ($entry['changes'] ?? [] as $ch) {
        $v = $ch['value'] ?? [];
        $phoneId = $v['metadata']['phone_number_id'] ?? ($cfg['wa_phone_number_id'] ?? '');
        foreach ($v['messages'] ?? [] as $m) {
            if (($m['type'] ?? '') !== 'text' || seen((string)($m['id'] ?? ''))) continue;
            $reply = answer('wa:' . $m['from'], (string)$m['text']['body'], 'WhatsApp', $site);
            if ($reply !== '') graph_post("$graph/$phoneId/messages",
                ['messaging_product' => 'whatsapp', 'to' => $m['from'], 'type' => 'text', 'text' => ['body' => $reply, 'preview_url' => true]], $cfg['wa_token']);
        }
    }
    exit;
}

/* ---------- 3b. Instagram y Messenger ---------- */
if (in_array($body['object'] ?? '', ['instagram', 'page'], true) && !empty($cfg['page_token'])) {
    $channel = $body['object'] === 'instagram' ? 'Instagram' : 'Messenger';
    foreach ($body['entry'] ?? [] as $entry) foreach ($entry['messaging'] ?? [] as $ev) {
        $text = $ev['message']['text'] ?? '';
        if ($text === '' || !empty($ev['message']['is_echo']) || seen((string)($ev['message']['mid'] ?? ''))) continue;
        $to = (string)($ev['sender']['id'] ?? '');
        $reply = answer(strtolower($channel) . ':' . $to, $text, $channel, $site);
        if ($reply !== '') graph_post("$graph/me/messages", ['recipient' => ['id' => $to], 'messaging_type' => 'RESPONSE', 'message' => ['text' => mb_substr($reply, 0, 1000)]], $cfg['page_token']);
    }
}
