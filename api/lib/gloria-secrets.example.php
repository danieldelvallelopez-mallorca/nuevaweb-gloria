<?php
/* PLANTILLA. Copiar como  gloria-secrets.php  UN NIVEL POR ENCIMA de public_html
   (misma carpeta que contiene public_html), rellenar y NO subir nunca a GitHub. */
return [
    // IA del concierge (console.anthropic.com → API keys)
    'anthropic_api_key'  => '',
    'anthropic_model'    => 'claude-haiku-4-5-20251001',
    'limite_diario_ia'   => 800,           // llamadas a la IA al día entre todos los canales; al llegar, respuestas guiadas
    'confiar_cf_connecting_ip' => false,   // true SOLO si la web se pone detrás de Cloudflare
    'origenes_extra'     => [],            // dominios propios que no estén en gloria_origin_ok() (api/lib/brain.php)
    'limite_diario_candidaturas' => 40,    // candidaturas con CV al día; al llegar, «inténtalo más tarde»

    // Meta · webhook (la app de Meta for Developers)
    'meta_app_secret'    => '',            // App → Configuración → Básica → Clave secreta de la app
    'meta_verify_token'  => '',            // texto inventado por IT; el mismo que se pone al configurar el webhook
    'meta_graph_version' => 'v21.0',

    // WhatsApp Business (Cloud API)
    'wa_token'           => '',            // token PERMANENTE de un usuario del sistema con whatsapp_business_messaging
    'wa_phone_number_id' => '',            // ID del número (no el número)

    // Instagram + Messenger
    'page_token'         => '',            // token de página de Facebook vinculada a la cuenta de Instagram del hotel

    // Trabaja con nosotros: a quién avisar de cada candidatura (el CV va adjunto)
    // (por defecto todo llega a director@gloriasantjaume.com; ver ROUTES en api/careers.php)
    'careers_hr'         => [],            // p. ej. ['rrhh@cabauhotels.com'] → recibe TODAS las candidaturas
    'careers_routes'     => [],            // p. ej. ['gloria' => ['director@gloriasantjaume.com']] por hotel
    // Envío de emails (candidaturas y confirmaciones) con un buzón REAL del dominio, para que no acaben en spam.
    // Sin esto se usa mail() del servidor con no-reply@hotelgloria.es, que no tiene SPF y suele rechazarse.
    'smtp'               => ['host' => 'smtp.serviciodecorreo.es', 'port' => 465, 'user' => '', 'pass' => ''],   // p. ej. web@gloriasantjaume.com
    'mail_from_name'     => 'Glòria de Sant Jaume',
    'careers_from'       => 'no-reply@hotelgloria.es',   // remitente; mejor un buzón real del dominio
];
