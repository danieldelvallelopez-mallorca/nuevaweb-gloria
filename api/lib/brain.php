<?php
/* Cerebro común del concierge (web + WhatsApp + Instagram/Messenger).
   Las claves NO están en el repositorio: se leen de gloria-secrets.php,
   un nivel por encima de public_html (ver api/LEEME-IT.md). */

function gloria_secrets(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $file = dirname(__DIR__, 3) . '/gloria-secrets.php';
    $cfg = is_file($file) ? (require $file) : [];
    return is_array($cfg) ? $cfg : [];
}

function gloria_music_tonight(string $date): string {
    $js = @file_get_contents(dirname(__DIR__, 2) . '/js/music-data.js');
    if (!$js || !preg_match('/GLORIA_MUSIC\s*=\s*(\{.*\});/s', $js, $m)) return '';
    $d = json_decode($m[1], true);
    if (!$d) return '';
    $lines = [];
    foreach ($d['entries'] as $day => $e) {
        $lines[] = sprintf('%04d-%02d-%02d: %s%s', $d['year'], $d['month'], (int)$day, $e[0], $e[1] ? " ({$e[1]})" : '');
    }
    return "Live music programme at El Patio (20:00–22:00):\n" . implode("\n", $lines);
}

function gloria_system_prompt(string $lang, string $today, string $channel): string {
    $music = gloria_music_tonight($today);
    return <<<TXT
You are the concierge of Hotel Glòria de Sant Jaume, an intimate five-star boutique hotel in a historic house in the old town of Palma de Mallorca (Cabau Hotels). Today is {$today}. Channel: {$channel}.

VOICE: warm, discreet, elegant, brief (2–4 sentences). Formal "usted" in Spanish, "Sie" in German, "vous" in French. Reply in the guest's language (site language hint: {$lang}). No emojis, no exclamation marks, never use the word "concierto".

YOUR JOB: help the guest book a room or a table at El Patio, and answer questions about the house. You never take payments, card data or personal documents and you never confirm a booking yourself: you hand over to the booking engine (rooms) or the table reservation page (El Patio), or to the team.

FACTS (only use these; if something is not here — check-in times, parking, pets, room prices, availability — say you will not guess and offer the booking engine or the team):
- Address: Carrer Sant Jaume, 18 · 07012 Palma. Old town, a short walk from the Cathedral, the Born and Jaume III.
- Reservations phone: +34 971 92 18 91 · Hotel: +34 971 71 79 97 · reservas@gloriasantjaume.com · info@gloriasantjaume.com
- 14 rooms in three categories: Superior Room, Junior Suite, Duplex Suite. Rates and availability: only in the booking engine; booking direct with the house.
- El Patio de Glòria: the restaurant at the heart of the house, Mediterranean seasonal cooking, breakfast, dinner and cocktails. Every evening live music accompanies dinner from 20:00 to 22:00. El Patio rests on Tuesdays and Wednesdays.
- Wellness: beneath the house a heated pool in the old cistern, sauna and steam bath; a rooftop pool above Palma.
- Spa by Eric (treatments, VAT included, booked through reception): Sports, Relaxing, Lymphatic drainage, Reflexology & craniosacral, Pregnancy massage — 60 min 120 €. Ayurvedic and Lomi Lomi — 90 min 250 €. Inka energetic massage — 90 min 220 €. Facial & Kobido — 50 min 190 €. Complete rituals (exfoliation + shower + relaxing massage), 90 min 230 €: The Power of the Olive Tree, Lavender Garden, Organic Coconut. Open every day, subject to availability.
- Palma shopping partner: Luca Lorenzini, jewellery, next to the hotel.
{$music}

OUTPUT: answer ONLY with a JSON object, no other text:
{"reply": "<your message to the guest>", "action": "<one of: room, dinner, music, spa, where, human, none>"}
Use action "room" when the guest wants to see rooms/rates/availability, "dinner" to reserve a table, "human" when they ask for a person or something you cannot solve, otherwise the matching topic or "none".
TXT;
}

/** Llama a la IA. Devuelve ['reply'=>..., 'action'=>...] o null si no hay clave o falla. */
function gloria_ask(array $messages, string $lang, string $today, string $channel): ?array {
    $cfg = gloria_secrets();
    if (empty($cfg['anthropic_api_key'])) return null;
    $payload = [
        'model' => $cfg['anthropic_model'] ?? 'claude-haiku-4-5-20251001',
        'max_tokens' => 400,
        'system' => gloria_system_prompt($lang, $today, $channel),
        'messages' => $messages,
    ];
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => [
            'content-type: application/json',
            'x-api-key: ' . $cfg['anthropic_api_key'],
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $raw = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false || $code !== 200) { error_log("gloria concierge: IA http $code"); return null; }
    $res = json_decode($raw, true);
    $text = $res['content'][0]['text'] ?? '';
    if (preg_match('/\{.*\}/s', $text, $m)) {
        $j = json_decode($m[0], true);
        if (is_array($j) && !empty($j['reply'])) {
            $allowed = ['room', 'dinner', 'music', 'spa', 'where', 'human', 'none'];
            return ['reply' => (string)$j['reply'], 'action' => in_array($j['action'] ?? 'none', $allowed, true) ? $j['action'] : 'none'];
        }
    }
    return $text !== '' ? ['reply' => $text, 'action' => 'none'] : null;
}

/** Limpia el historial que llega de fuera: roles válidos, textos cortos, máx. 10 turnos, empieza por usuario. */
function gloria_clean_history($messages): array {
    $out = [];
    foreach (array_slice(is_array($messages) ? $messages : [], -10) as $m) {
        $role = ($m['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
        $content = trim(mb_substr((string)($m['content'] ?? ''), 0, 600));
        if ($content === '') continue;
        if ($out && end($out)['role'] === $role) { $out[count($out) - 1]['content'] .= "\n" . $content; continue; }
        $out[] = ['role' => $role, 'content' => $content];
    }
    while ($out && $out[0]['role'] !== 'user') array_shift($out);
    return $out;
}

/** Límite sencillo por clave (IP o usuario): $max peticiones cada $window segundos. */
function gloria_rate_ok(string $key, int $max = 20, int $window = 600): bool {
    $dir = sys_get_temp_dir() . '/gloria-rl';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $f = $dir . '/' . hash('sha256', $key);
    $now = time();
    $hits = array_filter(array_map('intval', @file($f, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > $now - $window);
    if (count($hits) >= $max) return false;
    $hits[] = $now;
    @file_put_contents($f, implode("\n", $hits), LOCK_EX);
    return true;
}
