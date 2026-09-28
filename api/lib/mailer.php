<?php
/* Envío de emails de la web (candidaturas y confirmaciones).
   Si gloria-secrets.php trae 'smtp' (buzón real del dominio, p. ej. de gloriasantjaume.com) se envía por SMTP autenticado,
   que es lo que hace que el correo llegue a la bandeja y no a spam. Si no, se usa mail() del servidor como último recurso.
   Configuración esperada:
     'smtp' => ['host' => 'smtp.serviciodecorreo.es', 'port' => 465, 'user' => 'web@gloriasantjaume.com', 'pass' => '…'],
   Puerto 465 = SSL directo; 587 = STARTTLS. */

/**
 * Envía un email con versión texto y, opcionalmente, HTML, imágenes incrustadas (logo) y adjuntos.
 * @param string[] $to
 * @param array{text:string, html?:?string} $content
 * @param array<int, array{name:string,type:string,data:string}> $attachments
 * @param array<string, array{type:string,data:string}> $inline  cid => imagen (se cita en el HTML como src="cid:…")
 */
function gloria_send_mail(array $to, string $subject, array $content, ?string $replyTo, array $attachments, array $inline, array $cfg): bool {
    $smtp = is_array($cfg['smtp'] ?? null) ? $cfg['smtp'] : null;
    $from = $smtp['user'] ?? ($cfg['careers_from'] ?? 'no-reply@hotelgloria.es');
    $fromName = $cfg['mail_from_name'] ?? 'Glòria de Sant Jaume';
    [$ctype, $body] = gloria_mime_body($content['text'], $content['html'] ?? null, $attachments, $inline);

    $domain = substr(strrchr($from, '@') ?: '@localhost', 1);
    $h = [
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . "@$domain>",
        'From: ' . gloria_mime_word($fromName) . " <$from>",
        'MIME-Version: 1.0',
        "Content-Type: $ctype",
    ];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $h[] = "Reply-To: $replyTo";
    $headers = implode("\r\n", $h);
    $encSubject = gloria_mime_word($subject);

    if ($smtp && !empty($smtp['host']) && !empty($smtp['user']) && !empty($smtp['pass'])) {
        $full = "To: " . implode(', ', $to) . "\r\nSubject: $encSubject\r\n$headers\r\n\r\n$body";
        if (gloria_smtp_send($smtp, $from, $to, $full)) return true;
        error_log('gloria mail: fallo SMTP, se intenta mail()');
    }
    return @mail(implode(', ', $to), $encSubject, $body, $headers, '-f' . $from);
}

function gloria_mime_word(string $s): string { return '=?UTF-8?B?' . base64_encode($s) . '?='; }

/** Cuerpo MIME: mixed( related( alternative(texto, html), imágenes ), adjuntos ). Devuelve [Content-Type, cuerpo]. */
function gloria_mime_body(string $text, ?string $html, array $attachments, array $inline): array {
    $part = fn(string $type, string $data, string $extra = '') =>
        "Content-Type: $type\r\nContent-Transfer-Encoding: base64\r\n$extra\r\n" . chunk_split(base64_encode($data));
    $wrap = function (string $sub, array $parts): array {
        $b = 'gloria-' . bin2hex(random_bytes(8));
        $out = '';
        foreach ($parts as $p) $out .= "--$b\r\n$p";
        return ["multipart/$sub; boundary=\"$b\"", $out . "--$b--\r\n"];
    };

    [$ct, $body] = ['text/plain; charset=UTF-8', chunk_split(base64_encode($text))];
    $isMultipart = false;
    if ($html !== null) {
        [$ct, $body] = $wrap('alternative', [$part('text/plain; charset=UTF-8', $text), $part('text/html; charset=UTF-8', $html)]);
        $isMultipart = true;
        if ($inline) {
            $parts = ["Content-Type: $ct\r\n\r\n$body"];
            foreach ($inline as $cid => $img) {
                $parts[] = $part($img['type'], $img['data'], "Content-ID: <$cid>\r\nContent-Disposition: inline; filename=\"$cid\"\r\n");
            }
            [$ct, $body] = $wrap('related', $parts);
        }
    }
    if ($attachments) {
        $first = $isMultipart ? "Content-Type: $ct\r\n\r\n$body" : $part('text/plain; charset=UTF-8', $text);
        $parts = [$first];
        foreach ($attachments as $a) {
            $parts[] = $part("{$a['type']}; name=\"{$a['name']}\"", $a['data'], "Content-Disposition: attachment; filename=\"{$a['name']}\"\r\n");
        }
        [$ct, $body] = $wrap('mixed', $parts);
    }
    return [$ct, $body];
}

/** Cliente SMTP mínimo con AUTH LOGIN (465 SSL o 587 STARTTLS). */
function gloria_smtp_send(array $s, string $from, array $to, string $message): bool {
    $port = (int)($s['port'] ?? 465);
    $host = (string)$s['host'];
    $remote = ($port === 465 ? 'ssl://' : 'tcp://') . "$host:$port";
    $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]));
    if (!$fp) { error_log("gloria smtp: conexión fallida ($errno $errstr)"); return false; }
    stream_set_timeout($fp, 20);

    $read = function () use ($fp): string {
        $out = '';
        while (($line = fgets($fp, 1024)) !== false) { $out .= $line; if (strlen($line) < 4 || $line[3] === ' ') break; }
        return $out;
    };
    // $secret = true: el comando lleva credenciales o datos personales y nunca se escribe en el log
    $cmd = function (string $c, array $okCodes, bool $secret = false) use ($fp, $read): bool {
        if ($c !== '') fwrite($fp, $c . "\r\n");
        $r = $read();
        $ok = in_array((int)substr($r, 0, 3), $okCodes, true);
        if (!$ok) error_log('gloria smtp: ' . ($secret ? '[oculto]' : substr($c, 0, 60)) . ' → ' . trim($r));
        return $ok;
    };

    $ehlo = 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $ok = $cmd('', [220]) && $cmd($ehlo, [250]);
    if ($ok && $port !== 465) {
        $ok = $cmd('STARTTLS', [220]) && stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd($ehlo, [250]);
    }
    $ok = $ok && $cmd('AUTH LOGIN', [334]) && $cmd(base64_encode((string)$s['user']), [334], true) && $cmd(base64_encode((string)$s['pass']), [235], true)
        && $cmd("MAIL FROM:<$from>", [250]);
    foreach ($to as $rcpt) { $ok = $ok && $cmd("RCPT TO:<$rcpt>", [250, 251], true); }
    if ($ok && $cmd('DATA', [354])) {
        $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $message));   // dot-stuffing
        $ok = $cmd($data . "\r\n.", [250], true);
    } else {
        $ok = false;
    }
    $cmd('QUIT', [221]);
    fclose($fp);
    return $ok;
}
