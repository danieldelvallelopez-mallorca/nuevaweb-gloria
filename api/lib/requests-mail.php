<?php
/* Plantillas de los emails de solicitudes de servicios (catálogo data/services.json):
   acuse al cliente (5 idiomas, "aún no es una confirmación") y aviso interno al equipo de reservas.
   Reutiliza el logo incrustado y el escape HTML de careers-mail.php; misma maqueta visual. */
require_once __DIR__ . '/careers-mail.php';

const REQUESTS_SIGNATURE = [
    'hotel'   => 'Hotel Glòria de Sant Jaume',
    'address' => 'Carrer Sant Jaume, 18 · 07012 Palma de Mallorca',
    'phone'   => '+34 971 71 79 97',
    'email'   => 'reservas@gloriasantjaume.com',
    'privacy' => 'info@gloriasantjaume.com',
    'web'     => 'gloriasantjaume.com',
];

/** Textos del acuse, por idioma. {n} = nombre de pila. */
function requests_texts(string $lang): array {
    $c = CAREERS_CONTROLLER;
    $p = REQUESTS_SIGNATURE['privacy'];
    $t = [
        'en' => [
            'subject'    => 'We have received your request · {t}',
            'hello'      => 'Hello {n},',
            'body'       => ['Thank you for your request. We have received it — this is not yet a confirmation; our team will confirm shortly.',
                             'Here is a summary of what you sent us:'],
            'after'      => 'If you need to change anything, simply reply to this email.',
            'bye'        => 'Kind regards,',
            'team'       => 'Reservations team',
            'labels'     => ['kind' => 'Request', 'date' => 'Date', 'time' => 'Time', 'pax' => 'Guests', 'treatment' => 'Treatment', 'room' => 'Room', 'notes' => 'Notes'],
            'legal'      => ['This message and any attachments are confidential and intended solely for the addressee. If you have received it in error, please notify the sender and delete it.',
                             "Data protection. Controller: $c. Purpose: to manage your request and contact you about it. Legal basis: pre-contractual steps taken at your request. Retention: only as long as needed to manage your request, as described in our privacy policy. Recipients: none, except where required by law. Rights: access, rectification, erasure, objection, restriction and portability, by writing to $p. You may lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).",
                             'You are receiving this email because you sent a request through our website.'],
        ],
        'es' => [
            'subject'    => 'Hemos recibido su solicitud · {t}',
            'hello'      => 'Hola {n},',
            'body'       => ['Gracias por su solicitud. La hemos recibido; todavía no es una confirmación: nuestro equipo se la confirmará en breve.',
                             'Este es el resumen de lo que nos ha enviado:'],
            'after'      => 'Si necesita cambiar algo, basta con responder a este email.',
            'bye'        => 'Un saludo,',
            'team'       => 'Equipo de reservas',
            'labels'     => ['kind' => 'Solicitud', 'date' => 'Fecha', 'time' => 'Hora', 'pax' => 'Personas', 'treatment' => 'Tratamiento', 'room' => 'Habitación', 'notes' => 'Observaciones'],
            'legal'      => ['Este mensaje y sus anexos son confidenciales y van dirigidos exclusivamente a su destinatario. Si lo ha recibido por error, le rogamos que lo comunique al remitente y lo elimine.',
                             "Protección de datos. Responsable: $c. Finalidad: gestionar su solicitud y contactar con usted sobre ella. Legitimación: medidas precontractuales adoptadas a petición suya. Conservación: solo el tiempo necesario para gestionar su solicitud, según nuestra política de privacidad. Destinatarios: no se ceden a terceros, salvo obligación legal. Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad, escribiendo a $p. Puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
                             'Recibe este email porque ha enviado una solicitud a través de nuestra web.'],
        ],
        'de' => [
            'subject'    => 'Wir haben Ihre Anfrage erhalten · {t}',
            'hello'      => 'Hallo {n},',
            'body'       => ['vielen Dank für Ihre Anfrage. Wir haben sie erhalten – dies ist noch keine Bestätigung; unser Team bestätigt sie Ihnen in Kürze.',
                             'Hier eine Zusammenfassung Ihrer Angaben:'],
            'after'      => 'Wenn Sie etwas ändern möchten, antworten Sie einfach auf diese E-Mail.',
            'bye'        => 'Mit freundlichen Grüßen',
            'team'       => 'Reservierungsteam',
            'labels'     => ['kind' => 'Anfrage', 'date' => 'Datum', 'time' => 'Uhrzeit', 'pax' => 'Personen', 'treatment' => 'Behandlung', 'room' => 'Zimmer', 'notes' => 'Anmerkungen'],
            'legal'      => ['Diese Nachricht und ihre Anhänge sind vertraulich und ausschließlich für den Empfänger bestimmt. Sollten Sie sie irrtümlich erhalten haben, informieren Sie bitte den Absender und löschen Sie sie.',
                             "Datenschutz. Verantwortlicher: $c. Zweck: Bearbeitung Ihrer Anfrage und Kontaktaufnahme dazu. Rechtsgrundlage: vorvertragliche Maßnahmen auf Ihre Anfrage. Aufbewahrung: nur so lange, wie es für die Bearbeitung Ihrer Anfrage nötig ist, gemäß unserer Datenschutzerklärung. Empfänger: keine, außer bei gesetzlicher Verpflichtung. Rechte: Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung und Übertragbarkeit unter $p. Sie können Beschwerde bei der spanischen Datenschutzbehörde einlegen (www.aepd.es).",
                             'Sie erhalten diese E-Mail, weil Sie über unsere Website eine Anfrage gesendet haben.'],
        ],
        'fr' => [
            'subject'    => 'Nous avons bien reçu votre demande · {t}',
            'hello'      => 'Bonjour {n},',
            'body'       => ['Merci pour votre demande. Nous l’avons bien reçue — ce n’est pas encore une confirmation ; notre équipe vous la confirmera très vite.',
                             'Voici le récapitulatif de votre demande :'],
            'after'      => 'Pour toute modification, il vous suffit de répondre à cet e-mail.',
            'bye'        => 'Bien cordialement,',
            'team'       => 'Équipe des réservations',
            'labels'     => ['kind' => 'Demande', 'date' => 'Date', 'time' => 'Heure', 'pax' => 'Personnes', 'treatment' => 'Soin', 'room' => 'Chambre', 'notes' => 'Remarques'],
            'legal'      => ['Ce message et ses pièces jointes sont confidentiels et destinés exclusivement à leur destinataire. Si vous l’avez reçu par erreur, merci d’en informer l’expéditeur et de le supprimer.',
                             "Protection des données. Responsable : $c. Finalité : gérer votre demande et vous contacter à son sujet. Base juridique : mesures précontractuelles prises à votre demande. Conservation : uniquement le temps nécessaire pour gérer votre demande, conformément à notre politique de confidentialité. Destinataires : aucun, sauf obligation légale. Droits : accès, rectification, effacement, opposition, limitation et portabilité, en écrivant à $p. Vous pouvez introduire une réclamation auprès de l’autorité espagnole de protection des données (www.aepd.es).",
                             'Vous recevez cet e-mail parce que vous avez envoyé une demande via notre site web.'],
        ],
        'sv' => [
            'subject'    => 'Vi har tagit emot din förfrågan · {t}',
            'hello'      => 'Hej {n},',
            'body'       => ['Tack för din förfrågan. Vi har tagit emot den – detta är ännu ingen bekräftelse; vårt team bekräftar den inom kort.',
                             'Här är en sammanfattning av det du skickade:'],
            'after'      => 'Om du vill ändra något svarar du bara på detta e-postmeddelande.',
            'bye'        => 'Vänliga hälsningar',
            'team'       => 'Bokningsteamet',
            'labels'     => ['kind' => 'Förfrågan', 'date' => 'Datum', 'time' => 'Tid', 'pax' => 'Personer', 'treatment' => 'Behandling', 'room' => 'Rum', 'notes' => 'Önskemål'],
            'legal'      => ['Detta meddelande och dess bilagor är konfidentiella och endast avsedda för mottagaren. Om du har fått det av misstag, meddela avsändaren och radera det.',
                             "Dataskydd. Personuppgiftsansvarig: $c. Ändamål: att hantera din förfrågan och kontakta dig om den. Rättslig grund: åtgärder före avtal på din begäran. Lagring: endast så länge som behövs för att hantera din förfrågan, enligt vår integritetspolicy. Mottagare: inga, utom när lagen kräver det. Rättigheter: tillgång, rättelse, radering, invändning, begränsning och dataportabilitet, genom att skriva till $p. Du kan lämna klagomål till den spanska dataskyddsmyndigheten (www.aepd.es).",
                             'Du får detta e-postmeddelande eftersom du har skickat en förfrågan via vår webbplats.'],
        ],
    ];
    return $t[$lang] ?? $t['en'];
}

/** Fecha legible en el idioma del cliente (intl si está disponible; si no, dd/mm/aaaa). */
function requests_format_date(string $iso, string $lang): string {
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $iso, new DateTimeZone('Europe/Madrid'));
    if (!$d) return $iso;
    if (class_exists('IntlDateFormatter')) {
        $f = new IntlDateFormatter($lang, IntlDateFormatter::FULL, IntlDateFormatter::NONE, 'Europe/Madrid');
        $s = $f->format($d);
        if (is_string($s) && $s !== '') return $s;
    }
    return $d->format('d/m/Y');
}

/** Texto del catálogo (data/services.json) en el idioma dado: {es,en,de,fr,sv} o cadena; si falta, inglés y luego español. */
function requests_tx($o, string $lang): string {
    if (is_string($o)) return $o;
    if (!is_array($o)) return '';
    foreach ([$lang, 'en', 'es'] as $l) {
        if (isset($o[$l]) && is_string($o[$l]) && $o[$l] !== '') return $o[$l];
    }
    return '';
}

/**
 * Filas del resumen en el idioma dado, como pares [etiqueta, valor] (así dos etiquetas iguales no se pisan).
 * Devuelve [principales (servicio, fecha, hora, personas), resto (campos extra, habitación, notas)].
 */
function requests_summary_rows(array $r, array $labels, string $lang, bool $guestCopy = false): array {
    $svc = is_array($r['service'] ?? null) ? $r['service'] : [];
    $main = [
        [$labels['kind'], requests_tx($svc['title'] ?? null, $lang) ?: (string)$r['kind']],
        [$labels['date'], requests_format_date($r['date'], $lang)],
    ];
    if ((string)($r['time'] ?? '') !== '') {
        $main[] = [requests_tx($svc['time']['label'] ?? null, $lang) ?: $labels['time'], $r['time']];
    }
    if (is_array($svc['pax'] ?? null)) {
        $main[] = [requests_tx($svc['pax']['label'] ?? null, $lang) ?: $labels['pax'], (string)$r['pax']];
    }
    $rest = [];
    $values = is_array($r['values'] ?? null) ? $r['values'] : [];
    foreach (($svc['fields'] ?? []) as $f) {
        if (!is_array($f) || !isset($f['name']) || !array_key_exists($f['name'], $values)) continue;
        $v = (string)$values[$f['name']];
        if (($f['type'] ?? '') === 'select') {
            foreach (($f['options'] ?? []) as $o) {
                if (is_array($o) && (string)($o['value'] ?? '') === $v) { $v = requests_tx($o['label'] ?? null, $lang) ?: $v; break; }
            }
        }
        // el acuse al cliente no repite texto libre escrito por quien envía el formulario
        // (evita usar la web como «relé» de correos con la marca del hotel)
        if ($guestCopy && ($f['type'] ?? '') === 'text') continue;
        $rest[] = [requests_tx($f['label'] ?? null, $lang) ?: (string)$f['name'], $v];
    }
    if (!empty($r['room'])) $rest[] = [$labels['room'], $r['room']];
    if (!$guestCopy && !empty($r['notes'])) $rest[] = [$labels['notes'], $r['notes']];
    return [$main, $rest];
}

function requests_rows_text(array $rows): string {
    $text = '';
    foreach ($rows as [$k, $v]) $text .= "$k: $v\n";
    return $text;
}

function requests_table_html(array $rows): string {
    $tbl = '';
    foreach ($rows as [$k, $v]) {
        $tbl .= '<tr><td style="padding:6px 14px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8A7B6C;white-space:nowrap;vertical-align:top">' . careers_h((string)$k) . '</td>'
            . '<td style="padding:6px 0;font-size:15px;white-space:pre-line">' . careers_h((string)$v) . '</td></tr>';
    }
    return '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border-top:1px solid #E4DACB;border-bottom:1px solid #E4DACB;width:100%">' . $tbl . '</table>';
}

/** Maqueta HTML: logo, cuerpo, firma del equipo de reservas y pie legal. $blocksHtml ya viene escapado. */
function requests_html(string $blocksHtml, string $team, array $legal, bool $hasLogo): string {
    $s = REQUESTS_SIGNATURE;
    $logo = $hasLogo ? '<tr><td align="center" style="padding:34px 24px 10px"><img src="cid:logo" width="120" alt="Glòria de Sant Jaume" style="display:block;width:120px;height:auto;border:0"></td></tr>' : '';
    $legalHtml = '';
    foreach ($legal as $p) $legalHtml .= '<p style="margin:0 0 8px">' . careers_h($p) . '</p>';
    return '<!doctype html><html><body style="margin:0;padding:0;background:#F3EDE2">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE2"><tr><td align="center" style="padding:24px 12px">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#FFFDF9;border:1px solid #E4DACB">'
        . $logo
        . '<tr><td style="padding:18px 40px 8px;font-family:Georgia,\'Times New Roman\',serif;font-size:16px;line-height:1.65;color:#2B2118">' . $blocksHtml . '</td></tr>'
        . '<tr><td style="padding:10px 40px 30px;font-family:Georgia,\'Times New Roman\',serif;color:#2B2118">'
        . '<div style="width:40px;height:1px;background:#9DD4CA;margin:0 0 14px"></div>'
        . '<p style="margin:0;font-size:17px">' . careers_h($team) . '</p>'
        . '<p style="margin:2px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5F4B3C">' . careers_h($s['hotel']) . '</p>'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6E5B49">' . careers_h($s['address']) . '<br>'
        . careers_h($s['phone']) . ' · <a href="mailto:' . careers_h($s['email']) . '" style="color:#5F4B3C">' . careers_h($s['email']) . '</a><br>'
        . '<a href="https://' . careers_h($s['web']) . '" style="color:#5F4B3C">' . careers_h($s['web']) . '</a></p>'
        . '</td></tr>'
        . '<tr><td style="padding:18px 40px 26px;border-top:1px solid #E4DACB;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:1.55;color:#8A7B6C">' . $legalHtml . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

/** Acuse al cliente: [asunto, texto, html, inline]. */
function requests_guest_mail(array $r, string $lang): array {
    $t = requests_texts($lang);
    $s = REQUESTS_SIGNATURE;
    // solo letras del primer nombre (máx. 30): nada de enlaces ni texto arbitrario en el saludo
    $first = mb_substr(preg_replace('/[^\p{L}\-\x{27}]/u', '', preg_split('/\s+/', trim($r['name']))[0] ?? ''), 0, 30);
    $hello = str_replace('{n}', $first, $t['hello']);
    [$main, $rest] = requests_summary_rows($r, $t['labels'], $lang, true);
    $rows = array_merge($main, $rest);
    $title = requests_tx($r['service']['title'] ?? null, $lang) ?: (string)$r['kind'];
    $subject = str_replace('{t}', $title, $t['subject']);

    $text = $hello . "\n\n" . implode("\n\n", $t['body']) . "\n\n";
    $text .= requests_rows_text($rows);
    $text .= "\n" . $t['after'] . "\n\n" . $t['bye'] . "\n\n"
        . "{$t['team']}\n{$s['hotel']}\n{$s['address']}\n{$s['phone']} · {$s['email']}\n{$s['web']}\n\n"
        . "—\n" . implode("\n\n", $t['legal']) . "\n";

    $blocks = '<p style="margin:0 0 16px">' . careers_h($hello) . '</p>';
    foreach ($t['body'] as $p) $blocks .= '<p style="margin:0 0 16px">' . careers_h($p) . '</p>';
    $blocks .= requests_table_html($rows)
        . '<p style="margin:0 0 16px">' . careers_h($t['after']) . '</p>'
        . '<p style="margin:0 0 4px">' . careers_h($t['bye']) . '</p>';

    $inline = careers_inline_logo();
    return [$subject, $text, requests_html($blocks, $t['team'], $t['legal'], (bool)$inline), $inline];
}

/** Aviso interno al equipo de reservas (en español): [asunto, texto, html, inline]. */
function requests_internal_mail(array $r): array {
    $t = requests_texts('es');
    [$main, $rest] = requests_summary_rows($r, $t['labels'], 'es');
    $contact = [
        ['Nombre', $r['name'] !== '' ? $r['name'] : '—'],
        ['Teléfono', $r['phone'] ?: '—'],
        ['Email', $r['email'] ?: '—'],
        ['Idioma', strtoupper($r['lang'])],
    ];
    $rows = array_merge($main, $contact, $rest);
    // proveedor externo del servicio (p. ej. transfers → gprivatedriver.com), solo para el equipo
    if (!empty($r['service']['provider'])) $rows[] = ['Proveedor', (string)$r['service']['provider']];
    $safeName = preg_replace('/[^\p{L}\p{N} ._-]/u', '', $r['name']);
    $what = requests_tx($r['service']['title'] ?? null, 'es') ?: (string)$r['kind'];
    $when = trim($r['date'] . ' ' . ($r['time'] ?? ''));
    $paxPart = is_array($r['service']['pax'] ?? null) ? " · {$r['pax']} pax" : '';
    $roomPart = !empty($r['room']) ? " · hab. {$r['room']}" : '';
    $subject = "Solicitud web · $what · $when$paxPart$roomPart · $safeName";
    $legal = ['Contiene datos personales de un cliente. Uso exclusivo para gestionar esta solicitud. Recuerde que la web NO confirma: el cliente espera nuestra confirmación.'];
    $how = $r['email'] ? 'Al responder a este email contestas directamente al cliente.' : 'El cliente no ha dejado email: confirmar por teléfono.';

    $text = "Nueva solicitud desde la web (pendiente de confirmar)\n\n";
    $text .= requests_rows_text($rows);
    $text .= "\n$how\n\n—\n" . $legal[0] . "\n";

    $blocks = '<p style="margin:0 0 14px;font-size:20px">Nueva solicitud desde la web</p>'
        . '<p style="margin:0 0 14px;font-size:14px;color:#9b3b2e">Pendiente de confirmar al cliente.</p>'
        . requests_table_html($rows)
        . '<p style="margin:0 0 4px;font-size:14px;color:#6E5B49">' . careers_h($how) . '</p>';

    $inline = careers_inline_logo();
    return [$subject, $text, requests_html($blocks, 'Web · Glòria de Sant Jaume', $legal, (bool)$inline), $inline];
}
