# Concierge Glòria — instrucciones para IT

El asistente de la web (el círculo con el monograma) y, si se conecta Meta, el mismo cerebro en WhatsApp, Instagram y Messenger. Mientras no haya clave de IA, la web usa sus respuestas guiadas y el webhook contesta con los enlaces fijos: no se rompe nada por no configurarlo.

## 1. Fichero de claves (nunca en GitHub ni dentro de public_html)

1. Copiar `api/lib/gloria-secrets.example.php` como `gloria-secrets.php` en la carpeta que **contiene** `public_html` (un nivel por encima).
2. Permisos `600`.
3. Rellenar:
   - `anthropic_api_key`: una clave **solo para el concierge** (console.anthropic.com → API keys), no la de otras herramientas. En la consola, poner además un **límite de gasto mensual** a esa clave.
   - `limite_diario_ia`: llamadas a la IA al día entre todos los canales (800 por defecto). Al llegar, el concierge vuelve a las respuestas guiadas hasta el día siguiente y deja una línea en el `error_log`.
   - `confiar_cf_connecting_ip`: `false` mientras la web no vaya detrás de Cloudflare. Con `true` sin Cloudflare, cualquiera se salta el límite por IP.
4. Comprobar que la plantilla no se sirve: `curl -s -o /dev/null -w '%{http_code}\n' https://web.hotelgloria.es/api/lib/gloria-secrets.example.php` debe dar `403`.

## 2. Webhook de Meta (WhatsApp Business, Instagram, Messenger)

- URL de devolución: `https://web.hotelgloria.es/api/meta-webhook.php`
- Token de verificación: el mismo texto que `meta_verify_token`.
- `meta_app_secret` es obligatorio: sin él, el webhook rechaza todo (403), porque es lo que comprueba que el mensaje viene de Meta.
- Suscribir el campo `messages` en WhatsApp, Instagram y la página de Facebook.
- WhatsApp: `wa_token` (token permanente de un usuario del sistema con `whatsapp_business_messaging`) y `wa_phone_number_id` (el ID, no el número).
- Instagram y Messenger: `page_token` de la página vinculada a la cuenta de Instagram del hotel.

## 3. Límites que ya trae el código

| Dónde | Límite |
|---|---|
| Web | 20 mensajes cada 10 minutos por IP |
| WhatsApp, Instagram, Messenger | 15 mensajes cada 10 minutos por conversación |
| Todos los canales | `limite_diario_ia` llamadas a la IA al día |
| Anthropic | el límite mensual que se ponga en la consola |

## 4. Datos personales

- Las conversaciones de Meta se guardan en `gloria-data/` (fuera de `public_html`, permisos 700) durante 24 horas para dar contexto a la respuesta, y después **se borran**. El nombre del fichero es un hash del remitente.
- `seen.txt` guarda los últimos 500 identificadores de mensaje para no contestar dos veces; no guarda texto.
- El `error_log` solo registra códigos de error, nunca el texto de los huéspedes.

## 5. Probar

```bash
curl -s -X POST https://web.hotelgloria.es/api/concierge.php \
  -H 'Origin: https://web.hotelgloria.es' -H 'Content-Type: application/json' \
  --data '{"lang":"es","messages":[{"role":"user","content":"¿Tenéis piscina?"}]}'
```

`200` con `{"reply": ..., "action": ...}` si la clave está puesta; `503` si no (la web sigue con las respuestas guiadas).
