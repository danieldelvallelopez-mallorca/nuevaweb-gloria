<?php
/* Envío de emails de la web (candidaturas y confirmaciones).
   Si gloria-secrets.php trae 'smtp' (buzón real del dominio, p. ej. de gloriasantjaume.com) se envía por SMTP autenticado,
   que es lo que hace que el correo llegue a la bandeja y no a spam. Si no, se usa mail() del servidor como último recurso.
   Configuración esperada:
     'smtp' => ['host' => 'smtp.serviciodecorreo.es', 'port' => 465, 'user' => 'web@gloriasantjaume.com', 'pass' => '…'],
   Puerto 465 = SSL directo; 587 = STARTTLS. */

/**
 * @param string[] $to
 * @param array{name:string,type:string,data:string}|null $attachment
 */
function gloria_send_mail(array $to, string $subject, string $text, ?string $replyTo, ?array $attachment, array $cfg): bool {
    $smtp = is_array($cfg['smtp'] ?? null) ? $cfg['smtp'] : null;
    $from = $smtp['user'] ?? ($cfg['careers_from'] ?? 'no-reply@hotelgloria.es');
    $fromName = $cfg['mail_from_name'] ?? 'Glòria de Sant Jaume';
    [$headers, $body] = gloria_build_mime($to, $from, $fromName, $subject, $text, $replyTo, $attachment);

    if ($smtp && !empty($smtp['host']) && !empty($smtp['user']) && !empty($smtp['pass'])) {
        $ok = gloria_smtp_send($smtp, $from, $to, $headers . "\r\n\r\n" . $body);
        if ($ok) return true;
        error_log('gloria mail: fallo SMTP, se intenta mail()');
    }
    // mail() recibe To y Subject aparte: se quitan de las cabeceras para no duplicarlos
    $extra = preg_replace('/^(To|Subject):[^\r\n]*\r\n/mi', '', $headers);
    $encSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return @mail(implode(', ', $to), $encSubject, $body, $extra, '-f' . $from);
}

/** Cabeceras y cuerpo MIME (texto + adjunto opcional). */
function gloria_build_mime(array $to, string $from, string $fromName, string $subject, string $text, ?string $replyTo, ?array $att): array {
    $domain = substr(strrchr($from, '@') ?: '@localhost', 1);
    $h = [
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . "@$domain>",
        'From: =?UTF-8?B?' . base64_encode($fromName) . "?= <$from>",
        'To: ' . implode(', ', $to),
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'MIME-Version: 1.0',
    ];
    if ($replyTo && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) $h[] = "Reply-To: $replyTo";
    $textPart = "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($text));
    if (!$att) {
        $h[] = 'Content-Type: text/plain; charset=UTF-8';
        $h[] = 'Content-Transfer-Encoding: base64';
        return [implode("\r\n", $h), chunk_split(base64_encode($text))];
    }
    $b = 'gloria-' . bin2hex(random_bytes(8));
    $h[] = "Content-Type: multipart/mixed; boundary=\"$b\"";
    $body = "--$b\r\n$textPart"
        . "--$b\r\nContent-Type: {$att['type']}; name=\"{$att['name']}\"\r\nContent-Transfer-Encoding: base64\r\n"
        . "Content-Disposition: attachment; filename=\"{$att['name']}\"\r\n\r\n"
        . chunk_split(base64_encode($att['data'])) . "--$b--\r\n";
    return [implode("\r\n", $h), $body];
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
    // $secret = true: el comando lleva credenciales y nunca se escribe en el log
    $cmd = function (string $c, array $okCodes, bool $secret = false) use ($fp, $read): bool {
        if ($c !== '') fwrite($fp, $c . "\r\n");
        $r = $read();
        $ok = in_array((int)substr($r, 0, 3), $okCodes, true);
        if (!$ok) error_log('gloria smtp: ' . ($secret ? '[credenciales]' : substr($c, 0, 60)) . ' → ' . trim($r));
        return $ok;
    };

    $ehlo = 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost');
    $ok = $cmd('', [220]) && $cmd($ehlo, [250]);
    if ($ok && $port !== 465) {
        $ok = $cmd('STARTTLS', [220]) && stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) && $cmd($ehlo, [250]);
    }
    $ok = $ok && $cmd('AUTH LOGIN', [334]) && $cmd(base64_encode((string)$s['user']), [334], true) && $cmd(base64_encode((string)$s['pass']), [235], true)
        && $cmd("MAIL FROM:<$from>", [250]);
    foreach ($to as $rcpt) { $ok = $ok && $cmd("RCPT TO:<$rcpt>", [250, 251]); }
    if ($ok && $cmd('DATA', [354])) {
        $data = preg_replace('/^\./m', '..', str_replace(["\r\n", "\n"], ["\n", "\r\n"], $message));   // dot-stuffing
        $ok = $cmd($data . "\r\n.", [250], true);   // el cuerpo lleva datos personales: tampoco al log
    } else {
        $ok = false;
    }
    $cmd('QUIT', [221]);
    fclose($fp);
    return $ok;
}
