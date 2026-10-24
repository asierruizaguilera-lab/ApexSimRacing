# Seguridad — APEX SimRacing

Estado tras la tanda B de seguridad (octubre 2026). Este documento recoge qué se ha hecho, qué queda
pendiente, las variables de entorno nuevas y una checklist de pruebas manuales para antes de dar el
despliegue por bueno.

## Hecho

### Límites de peticiones (en memoria, una instancia)
| Qué | Límite | Dónde |
|---|---|---|
| Login fallido | 5 fallos / 15 min por IP + email | `src/lib/auth.ts` (`authorize`) |
| Registro | 5 / hora por IP | `src/app/api/auth/register` |
| Recuperar contraseña | 5 / hora por IP | `src/app/api/auth/recuperar` |
| Restablecer contraseña | 10 / hora por IP | `src/app/api/auth/restablecer` |
| Reenviar verificación, exportar datos, eliminar cuenta | 5 por usuario y ventana | rutas de `/api/perfil/*` |
| Resto de la API | 120 / min por IP | `server.js` (exentos: webhook PayPal, health, crons) |
| Tamaño del body en `/api/*` | 256 KB JSON, 6 MB multipart → 413 | `server.js` |

Todas responden 429 con `Retry-After` y dejan un log `SEGURIDAD` (el límite general, uno por IP y ventana).

### Cabeceras HTTP (`next.config.mjs`)
HSTS (solo producción), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (sin cámara, micro ni
geolocalización; `payment` solo para el propio sitio y PayPal) y CSP:
- `script-src`: propio + `'unsafe-inline'` (hidratación de Next, sin nonces) + PayPal.
- `frame-src`: YouTube (incluido youtube-nocookie), Google Slides/Drive y PayPal.
- `connect-src`: propio, el WebSocket propio (sale de `NEXTAUTH_URL` **en el build**) y PayPal.
- `img-src`: cualquier `https:` (avatares, logos y coches vienen de URLs externas, Wikimedia incluida).
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`.
- Se quitó la cabecera `X-Powered-By`.

### Validación de entrada
- Zod en todas las rutas API que leen body o querystring (`src/lib/validacion.ts`: `validarBody`,
  `validarQuery`, `validarForm`). Errores → 400 con el primer campo inválido.
- URLs que acaban en `href`/`src` solo aceptan `http(s)` o rutas locales (`urlSegura` en la API y
  `hrefSeguro()` al renderizar, que también cubre datos antiguos ya guardados).
- Subidas: logos de patrocinadores solo png/jpg/webp/gif ≤2 MB (antes cualquier extensión, incluido
  HTML/SVG en el mismo origen); avatares comprueban también el MIME y rechazan SVG.
- Emails: los datos de usuario (username, nombres de campeonato…) se escapan antes de meterlos en el HTML.
- No hay `dangerouslySetInnerHTML` en el código.

### Autenticación y sesión
- Sesión JWT de 7 días; además `server.js` corta la sesión a los 7 días desde el login (`authTime`)
  aunque se renueve.
- En **cada petición** `server.js` comprueba (caché de 15 s, invalidada al banear/eliminar) si el
  usuario está baneado, eliminado o si restableció la contraseña después del login. Baneado → 403 en
  la API y `/bloqueado` en páginas. Sesión inválida → se borra la cookie y 401 / `/login`.
- Contraseña mínima de 10 caracteres (registro, cambio y restablecimiento).
- Email de login sin distinguir mayúsculas; los emails nuevos se guardan en minúsculas.
- **Recuperar contraseña**: `/recuperar` → email con enlace a `/restablecer?token=…`. Token aleatorio
  de 32 bytes, en BD solo su sha256, caduca en 1 h, un solo uso. Al usarlo se invalidan todas las
  sesiones abiertas. La respuesta es la misma exista o no la cuenta.
- **Verificación de email**: al registrarse se envía un enlace (24 h). Sin verificar no se puede
  pagar (el modal de planes no recibe el Plan ID de PayPal y `create-subscription` responde 403) ni
  inscribirse en campeonatos (individuales o de equipo). Aviso con botón de reenvío en el panel.
  Las cuentas creadas antes de `VERIFICACION_EMAIL_DESDE` (por defecto 2026-10-25) cuentan como
  verificadas; los admins están exentos.
- **Sin `RESEND_API_KEY`** la app sigue funcionando: no se envían emails, la verificación se
  desactiva (nadie queda bloqueado) y `/recuperar` indica que el envío no está disponible.

### Autorización e IDOR
- `/admin` y `/api/admin` exigen ADMIN en el middleware y, otra vez, en cada página y ruta (revisadas
  las 17 páginas y todos los handlers). Se corrigió `GET /api/admin/coches`, que no lo comprobaba.
- **Socket.io**: `user:join` y `canal:join` dejaban unirse a cualquier sala por nombre, incluidas las
  privadas (`dm:*`, `equipo:*`, `user:*`), es decir, leer DMs y chats de equipo ajenos. Ahora solo se
  admiten los canales públicos; las salas privadas siguen con su comprobación de identidad.
- DMs, quejas/incidencias, pruebas, referidos y chat de equipo: revisados, filtran por el usuario de
  la sesión. `PATCH /api/notificaciones/[id]` sobre una notificación ajena daba 500; ahora 404.
- Ninguna respuesta incluye el hash de la contraseña (todas las consultas de usuarios que llegan al
  cliente usan `select` explícito).

### PayPal, crons y socket
- Webhook: en producción, sin `PAYPAL_WEBHOOK_ID` se rechaza todo con 503 (PayPal reintenta) y queda
  log `SEGURIDAD`. Firma inválida → 400 (ya existía).
- Crons: `CRON_SECRET` obligatorio (sin él, 503), comparación en tiempo constante. `server.js` lo envía
  en la cabecera `x-cron-secret` en vez de en la URL (sigue aceptándose `?secret=`).
- Socket: CORS a `NEXTAUTH_URL` (ya estaba), mensajes de 16 KB como máximo, 30 eventos / 10 s por
  socket (si se supera, se desconecta) y el indicador de "escribiendo" solo para sockets con sesión.

### RGPD
- Páginas públicas `/privacidad`, `/terminos` y `/cookies`, con todo lo dudoso marcado
  **[REVISAR ASESOR]**. Enlaces en el pie de la landing y casilla obligatoria de aceptación en el registro.
- Aviso de cookies informativo (solo hay cookies técnicas, no se pide consentimiento).
- YouTube embebido en modo `youtube-nocookie.com`.
- Perfil → "Privacidad y datos": **descargar mis datos** (JSON con perfil, suscripción, resultados,
  mensajes, incidencias, referidos y log de actividad) y **eliminar cuenta** (pide contraseña y escribir
  ELIMINAR): cancela la suscripción también en PayPal (y la de equipo si es líder único), sale del
  equipo, anonimiza el usuario (username/email ficticios, sin contraseña ni avatar), borra DMs enviados,
  mensajes de equipo, notificaciones y tokens, y oculta sus mensajes del chat. Los resultados quedan en
  las clasificaciones de forma anónima. Un líder con más pilotos debe transferir antes el liderazgo.
- Los usuarios sin suscripción también pueden entrar en su perfil para ejercer estos derechos.

### Operación
- `GET /api/health`: 200 / 503 según la BD, sin detalles internos.
- Páginas 404, error y error global propias, sin trazas.
- `.env.example` completo y aviso en el arranque por cada variable crítica que falte.
- `npm audit fix` (sin `--force`): de 14 vulnerabilidades a 6 (ver pendiente).

## Pendiente

1. **Dependencias con vulnerabilidades que requieren cambio de versión mayor** (no aplicado):
   - `next` 14 (crítica) y `postcss` (va con Next): la corrección está en Next 16. Requiere migración
     y pruebas completas.
   - `zod` 3 (alta, consumo de memoria con colecciones grandes): corregido en Zod 4 (breaking).
     Mitigado con el límite de body de 256 KB y `.max()` en todos los arrays.
2. **IP del cliente**: se usa `cf-connecting-ip` y, si no está, la primera IP de `x-forwarded-for`.
   Hay que confirmar en Render qué cabecera es fiable: si un cliente puede falsear la primera IP de
   `x-forwarded-for`, puede saltarse los límites por IP (no afecta a usuarios legítimos).
3. Los límites viven en memoria: se reinician en cada despliegue y no sirven con varias instancias.
4. CSP con `'unsafe-inline'` en scripts. Quitarlo exige nonces (middleware + render dinámico).
5. Cambiar la contraseña desde el perfil no cierra las otras sesiones (solo el restablecimiento por email).
6. La contraseña del servidor de juego (`servidorPassword`) la ve cualquier usuario con acceso al
   campeonato, no solo los inscritos. Decidir si debe restringirse.
7. Los logos y avatares subidos se guardan en `public/` del contenedor: se pierden en cada despliegue
   de Render (problema previo, no de seguridad).
8. Textos legales: revisión por un asesor de todo lo marcado **[REVISAR ASESOR]**.
9. Sin 2FA para administradores.

## Variables de entorno nuevas o que pasan a ser obligatorias

| Variable | Estado | Efecto si falta |
|---|---|---|
| `CRON_SECRET` | ahora obligatoria | Los crons responden 503 |
| `PAYPAL_WEBHOOK_ID` | obligatoria en producción | El webhook rechaza todos los eventos (503) |
| `RESEND_API_KEY` | recomendada | Sin emails; recuperación y verificación desactivadas |
| `LOG_SALT` | recomendada (tanda A) | El log de actividad no guarda `ipHash` |
| `VERIFICACION_EMAIL_DESDE` | opcional | Por defecto `2026-10-25T00:00:00Z` |
| `NEXTAUTH_URL` | ya existía | Debe estar también en el **build** (CSP del WebSocket) |

Cambios de esquema (solo aditivos, `db push` sin `--accept-data-loss`): modelo `TokenSeguridad` +
enum `TipoTokenSeguridad`, y en `User` los campos opcionales `eliminadoEn` y `passwordCambiadoEn`.

## Checklist de pruebas manuales

Antes del despliegue
- [ ] `CRON_SECRET`, `PAYPAL_WEBHOOK_ID`, `RESEND_API_KEY` y `LOG_SALT` configuradas en Render.
- [ ] El log de arranque no muestra avisos `[BOOT] ⚠️ Falta variable`.
- [ ] `prisma db push` aplicado (tabla `tokens_seguridad`, columnas nuevas en `users`).

Pagos y Academia (CSP)
- [ ] `/planes` → elegir plan → los botones de PayPal cargan y el popup/iframe de pago se abre sin
      errores CSP en la consola.
- [ ] Pago completo en sandbox: el plan se activa y llega el webhook (no 503 ni 400 en los logs).
- [ ] Una clase de la Academia con vídeo de YouTube y otra con presentación de Google Slides se ven.
- [ ] Chat en tiempo real: los mensajes llegan sin recargar (WebSocket no bloqueado por CSP).
- [ ] Avatares y logos externos (incluidas imágenes de Wikimedia) se ven.

Cuentas
- [ ] Registro: exige aceptar términos y 10 caracteres; llega el email de verificación.
- [ ] Sin verificar: aviso en el panel; el modal de pago muestra "Confirma tu email"; inscribirse da error.
- [ ] El enlace de verificación funciona una sola vez; tras verificar se puede pagar e inscribirse.
- [ ] Una cuenta antigua (anterior a `VERIFICACION_EMAIL_DESDE`) puede pagar sin verificar.
- [ ] `/recuperar` → email → `/restablecer` → nueva contraseña; la sesión abierta en otro navegador se cierra.
- [ ] El enlace de recuperación caduca a la hora y no sirve dos veces.
- [ ] 5 logins fallidos seguidos con el mismo email → mensaje de demasiados intentos.
- [ ] Banear a un usuario con sesión abierta: en ≤15 s su siguiente petición va a `/bloqueado`.

Admin y privacidad
- [ ] Un piloto que abre `/admin` vuelve a `/dashboard`; `/api/admin/*` le responde 403.
- [ ] Un piloto no recibe mensajes de un DM o chat de equipo ajeno aunque emita `canal:join` con esa sala.
- [ ] Perfil → descargar mis datos: el JSON no contiene el hash de la contraseña.
- [ ] Eliminar cuenta con suscripción PayPal: la suscripción aparece cancelada en PayPal y la sesión se cierra.
- [ ] Un usuario sin suscripción puede entrar en su perfil y eliminar la cuenta.
- [ ] `/privacidad`, `/terminos` y `/cookies` se ven sin sesión; el aviso de cookies sale una vez.

Operación
- [ ] `GET /api/health` responde 200.
- [ ] Las cabeceras de seguridad aparecen en producción (`curl -I https://…`).
- [ ] Los crons se ejecutan (logs `[CRON]` sin 401/503).
