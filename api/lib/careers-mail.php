<?php
/* Plantillas de los emails de "Trabaja con nosotros": acuse al candidato (5 idiomas) y aviso interno.
   Llevan el logo del hotel incrustado, la firma del director y el pie legal (confidencialidad + RGPD). */

const CAREERS_SIGNATURE = [
    'name'    => 'Daniel Del Valle',
    'hotel'   => 'Hotel Glòria de Sant Jaume',
    'address' => 'Carrer Sant Jaume, 18 · 07012 Palma de Mallorca',
    'phone'   => '+34 971 71 79 97',
    'email'   => 'director@gloriasantjaume.com',
    'web'     => 'gloriasantjaume.com',
];
const CAREERS_CONTROLLER = 'Hotel Glòria de Sant Jaume (Cabau Hotels) · CIF B57925323 · Carrer Sant Jaume, 18 · 07012 Palma';

/** Textos del acuse, por idioma. {n} = nombre de pila. */
function careers_texts(string $lang): array {
    $t = [
        'es' => [
            'subject' => 'Hemos recibido tu candidatura · Glòria de Sant Jaume',
            'hello'   => 'Hola {n},',
            'body'    => ['Gracias por tu interés en formar parte de Glòria de Sant Jaume. Hemos recibido tu candidatura y tu currículum.',
                          'Lo tendremos en cuenta para los procesos de selección actuales y futuros, y nos pondremos en contacto contigo si surge una vacante adecuada.'],
            'bye'     => 'Un saludo,',
            'role'    => 'Director',
            'legal'   => ['Este mensaje y sus anexos son confidenciales y van dirigidos exclusivamente a su destinatario. Si lo ha recibido por error, le rogamos que lo comunique al remitente y lo elimine.',
                          'Protección de datos. Responsable: ' . CAREERS_CONTROLLER . '. Finalidad: gestionar su candidatura en procesos de selección actuales y futuros. Legitimación: su consentimiento. Conservación: 12 meses, tras los cuales sus datos se borran. Destinatarios: no se ceden a terceros, salvo a los demás hoteles de Cabau Hotels si usted lo autorizó. Derechos: acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar su consentimiento en cualquier momento, escribiendo a ' . CAREERS_SIGNATURE['email'] . '. Puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).',
                          'Recibe este email porque ha enviado su candidatura a través de nuestra web.'],
        ],
        'en' => [
            'subject' => 'We have received your application · Glòria de Sant Jaume',
            'hello'   => 'Hello {n},',
            'body'    => ['Thank you for your interest in joining Glòria de Sant Jaume. We have received your application and your CV.',
                          'We will keep it in mind for current and future selection processes and will be in touch if there is a suitable opening.'],
            'bye'     => 'Kind regards,',
            'role'    => 'Director',
            'legal'   => ['This message and any attachments are confidential and intended solely for the addressee. If you have received it in error, please notify the sender and delete it.',
                          'Data protection. Controller: ' . CAREERS_CONTROLLER . '. Purpose: to manage your application in current and future selection processes. Legal basis: your consent. Retention: 12 months, after which your data is deleted. Recipients: none, except the other Cabau Hotels hotels if you allowed it. Rights: access, rectification, erasure, objection, restriction and portability, and to withdraw your consent at any time, by writing to ' . CAREERS_SIGNATURE['email'] . '. You may lodge a complaint with the Spanish Data Protection Agency (www.aepd.es).',
                          'You are receiving this email because you sent your application through our website.'],
        ],
        'de' => [
            'subject' => 'Wir haben Ihre Bewerbung erhalten · Glòria de Sant Jaume',
            'hello'   => 'Hallo {n},',
            'body'    => ['vielen Dank für Ihr Interesse an Glòria de Sant Jaume. Wir haben Ihre Bewerbung und Ihren Lebenslauf erhalten.',
                          'Wir berücksichtigen sie für aktuelle und künftige Auswahlverfahren und melden uns, wenn eine passende Stelle frei wird.'],
            'bye'     => 'Mit freundlichen Grüßen',
            'role'    => 'Direktor',
            'legal'   => ['Diese Nachricht und ihre Anhänge sind vertraulich und ausschließlich für den Empfänger bestimmt. Sollten Sie sie irrtümlich erhalten haben, informieren Sie bitte den Absender und löschen Sie sie.',
                          'Datenschutz. Verantwortlicher: ' . CAREERS_CONTROLLER . '. Zweck: Bearbeitung Ihrer Bewerbung in aktuellen und künftigen Auswahlverfahren. Rechtsgrundlage: Ihre Einwilligung. Aufbewahrung: 12 Monate, danach werden Ihre Daten gelöscht. Empfänger: keine, außer den anderen Hotels von Cabau Hotels, sofern Sie dies erlaubt haben. Rechte: Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung und Übertragbarkeit sowie jederzeitiger Widerruf Ihrer Einwilligung unter ' . CAREERS_SIGNATURE['email'] . '. Sie können Beschwerde bei der spanischen Datenschutzbehörde einlegen (www.aepd.es).',
                          'Sie erhalten diese E-Mail, weil Sie Ihre Bewerbung über unsere Website gesendet haben.'],
        ],
        'fr' => [
            'subject' => 'Nous avons bien reçu votre candidature · Glòria de Sant Jaume',
            'hello'   => 'Bonjour {n},',
            'body'    => ['Merci de votre intérêt pour Glòria de Sant Jaume. Nous avons bien reçu votre candidature et votre CV.',
                          'Nous en tiendrons compte pour nos recrutements actuels et futurs et vous contacterons si un poste adapté se présente.'],
            'bye'     => 'Bien cordialement,',
            'role'    => 'Directeur',
            'legal'   => ['Ce message et ses pièces jointes sont confidentiels et destinés exclusivement à leur destinataire. Si vous l’avez reçu par erreur, merci d’en informer l’expéditeur et de le supprimer.',
                          'Protection des données. Responsable : ' . CAREERS_CONTROLLER . '. Finalité : gérer votre candidature dans les recrutements actuels et futurs. Base juridique : votre consentement. Conservation : 12 mois, après quoi vos données sont supprimées. Destinataires : aucun, sauf les autres hôtels Cabau Hotels si vous l’avez autorisé. Droits : accès, rectification, effacement, opposition, limitation et portabilité, et retrait de votre consentement à tout moment, en écrivant à ' . CAREERS_SIGNATURE['email'] . '. Vous pouvez introduire une réclamation auprès de l’autorité espagnole de protection des données (www.aepd.es).',
                          'Vous recevez cet e-mail parce que vous avez envoyé votre candidature via notre site web.'],
        ],
        'sv' => [
            'subject' => 'Vi har tagit emot din ansökan · Glòria de Sant Jaume',
            'hello'   => 'Hej {n},',
            'body'    => ['Tack för ditt intresse för Glòria de Sant Jaume. Vi har tagit emot din ansökan och ditt CV.',
                          'Vi har den i åtanke för nuvarande och framtida rekryteringar och hör av oss om en passande tjänst dyker upp.'],
            'bye'     => 'Vänliga hälsningar',
            'role'    => 'Direktör',
            'legal'   => ['Detta meddelande och dess bilagor är konfidentiella och endast avsedda för mottagaren. Om du har fått det av misstag, meddela avsändaren och radera det.',
                          'Dataskydd. Personuppgiftsansvarig: ' . CAREERS_CONTROLLER . '. Ändamål: att hantera din ansökan i nuvarande och framtida rekryteringar. Rättslig grund: ditt samtycke. Lagring: 12 månader, därefter raderas dina uppgifter. Mottagare: inga, utom Cabau Hotels övriga hotell om du har tillåtit det. Rättigheter: tillgång, rättelse, radering, invändning, begränsning och dataportabilitet samt att när som helst återkalla ditt samtycke, genom att skriva till ' . CAREERS_SIGNATURE['email'] . '. Du kan lämna klagomål till den spanska dataskyddsmyndigheten (www.aepd.es).',
                          'Du får detta e-postmeddelande eftersom du har skickat din ansökan via vår webbplats.'],
        ],
    ];
    return $t[$lang] ?? $t['en'];
}

function careers_h(string $s): string { return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }

/** Logo incrustado (cid:logo) para los emails, si existe en la web. */
function careers_inline_logo(): array {
    $f = dirname(__DIR__, 2) . '/img/email-logo.png';
    return is_file($f) ? ['logo' => ['type' => 'image/png', 'data' => (string)file_get_contents($f)]] : [];
}

/** Maqueta HTML común: logo, cuerpo, firma y pie legal. $blocksHtml ya viene escapado. */
function careers_html(string $blocksHtml, string $role, array $legal, bool $hasLogo): string {
    $s = CAREERS_SIGNATURE;
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
        . '<p style="margin:0;font-size:17px">' . careers_h($s['name']) . '</p>'
        . '<p style="margin:2px 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5F4B3C">' . careers_h($role) . ' · ' . careers_h($s['hotel']) . '</p>'
        . '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#6E5B49">' . careers_h($s['address']) . '<br>'
        . careers_h($s['phone']) . ' · <a href="mailto:' . careers_h($s['email']) . '" style="color:#5F4B3C">' . careers_h($s['email']) . '</a><br>'
        . '<a href="https://' . careers_h($s['web']) . '" style="color:#5F4B3C">' . careers_h($s['web']) . '</a></p>'
        . '</td></tr>'
        . '<tr><td style="padding:18px 40px 26px;border-top:1px solid #E4DACB;font-family:Arial,Helvetica,sans-serif;font-size:10.5px;line-height:1.55;color:#8A7B6C">' . $legalHtml . '</td></tr>'
        . '</table></td></tr></table></body></html>';
}

/** Acuse de recibo al candidato: [asunto, texto, html, inline]. */
function careers_candidate_mail(array $record, string $lang): array {
    $t = careers_texts($lang);
    $s = CAREERS_SIGNATURE;
    $first = preg_split('/\s+/', trim($record['name']))[0] ?? '';
    $hello = str_replace('{n}', $first, $t['hello']);

    $text = $hello . "\n\n" . implode("\n\n", $t['body']) . "\n\n" . $t['bye'] . "\n\n"
        . "{$s['name']}\n{$t['role']} · {$s['hotel']}\n{$s['address']}\n{$s['phone']} · {$s['email']}\n{$s['web']}\n\n"
        . "—\n" . implode("\n\n", $t['legal']) . "\n";

    $blocks = '<p style="margin:0 0 16px">' . careers_h($hello) . '</p>';
    foreach ($t['body'] as $p) $blocks .= '<p style="margin:0 0 16px">' . careers_h($p) . '</p>';
    $blocks .= '<p style="margin:0 0 4px">' . careers_h($t['bye']) . '</p>';

    $inline = careers_inline_logo();
    return [$t['subject'], $text, careers_html($blocks, $t['role'], $t['legal'], (bool)$inline), $inline];
}

/** Aviso interno al director / RR. HH.: [asunto, texto, html, inline]. */
function careers_internal_mail(array $record): array {
    $rows = [
        'Nombre' => $record['name'], 'Email' => $record['email'], 'Teléfono' => $record['phone'] ?: '—',
        'Hotel' => $record['hotel'], 'Área' => $record['area'],
        'Compartir con el grupo' => $record['share_with_group'] ? 'Sí' : 'No',
        'Conservar hasta' => $record['delete_after'],
    ];
    $safeName = preg_replace('/[^\p{L}\p{N} ._-]/u', '', $record['name']);
    $subject = "Candidatura · {$record['hotel']} · {$record['area']} · $safeName";
    $legal = ['Contiene datos personales de un candidato. Uso exclusivo para el proceso de selección; no reenviar fuera del equipo que decide. La candidatura se borra del servidor automáticamente en la fecha indicada; borre también este email y el CV cuando ya no sean necesarios.'];

    $text = "Nueva candidatura desde la web\n\n";
    foreach ($rows as $k => $v) $text .= "$k: $v\n";
    $text .= "\nMensaje:\n" . ($record['message'] ?: '—') . "\n\nEl CV va adjunto. Responder a este email contesta directamente al candidato.\n\n—\n" . $legal[0] . "\n";

    $tbl = '';
    foreach ($rows as $k => $v) {
        $tbl .= '<tr><td style="padding:6px 14px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8A7B6C;white-space:nowrap;vertical-align:top">' . careers_h($k) . '</td>'
            . '<td style="padding:6px 0;font-size:15px">' . careers_h($v) . '</td></tr>';
    }
    $blocks = '<p style="margin:0 0 14px;font-size:20px">Nueva candidatura desde la web</p>'
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">' . $tbl . '</table>'
        . '<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8A7B6C">Mensaje</p>'
        . '<p style="margin:0 0 16px;white-space:pre-line">' . careers_h($record['message'] ?: '—') . '</p>'
        . '<p style="margin:0 0 4px;font-size:14px;color:#6E5B49">El CV va adjunto. Al responder a este email contestas directamente al candidato.</p>';

    $inline = careers_inline_logo();
    return [$subject, $text, careers_html($blocks, 'Director', $legal, (bool)$inline), $inline];
}
