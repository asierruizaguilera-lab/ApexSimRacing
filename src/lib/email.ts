interface EmailPayload {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[Email] Sin RESEND_API_KEY — email a ${to}: ${subject}`)
    return true
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'APEX SimRacing <noreply@apexsimracing.gg>',
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('[Email] Error enviando:', err)
    return false
  }
}

const BASE_URL = process.env.NEXTAUTH_URL || 'https://apexsimracing.gg'

const baseWrapper = (content: string) => `
  <div style="font-family:Inter,sans-serif;background:#111111;color:#F5F5F5;padding:0;margin:0;">
    <div style="max-width:600px;margin:0 auto;background:#1C1C1C;border-radius:12px;overflow:hidden;">
      <div style="background:#C0392B;padding:20px 32px;text-align:center;">
        <span style="color:white;font-size:24px;font-weight:900;letter-spacing:4px;">APEX</span>
        <br/><span style="color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:2px;">SIMRACING</span>
      </div>
      <div style="padding:32px;">
        ${content}
      </div>
      <div style="background:#111111;padding:16px 32px;text-align:center;border-top:1px solid #333;">
        <p style="color:#666;font-size:11px;margin:0;">APEX SimRacing — Del Simulador al Tramo Real</p>
      </div>
    </div>
  </div>
`

const btnRojo = (href: string, text: string) =>
  `<a href="${href}" style="display:inline-block;background:#C0392B;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;margin-top:20px;">${text}</a>`

export function emailBienvenida(username: string): string {
  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">¡Bienvenido a APEX, ${username}! 🏁</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 12px;">Tu cuenta ha sido creada. Bienvenido a la comunidad hispanohablante del motor.</p>
    <p style="color:#C0392B;font-style:italic;font-size:15px;margin:0 0 20px;">"Del Simulador al Tramo Real"</p>
    <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="margin:0;color:#F5F5F5;">🚗 Elige tu plan y desbloquea coches exclusivos</p>
      <p style="margin:8px 0 0;color:#F5F5F5;">🏆 Inscríbete en campeonatos organizados</p>
      <p style="margin:8px 0 0;color:#F5F5F5;">🌍 Conecta con pilotos hispanohablantes</p>
    </div>
    ${btnRojo(`${BASE_URL}/planes`, 'Ir a APEX →')}
  `)
}

export function emailSuscripcionActiva(
  username: string,
  plan: string,
  precio: number,
  fechaRenovacion?: string
): string {
  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">¡Tu plan ${plan} está activo! ⚡</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 16px;">Hola <strong style="color:#F5F5F5;">${username}</strong>,</p>
    <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="margin:0;color:#F5F5F5;">✅ Plan: <strong style="color:#C0392B;">${plan}</strong> — ${precio}€/mes</p>
      ${fechaRenovacion ? `<p style="margin:8px 0 0;color:#AAAAAA;">📅 Próxima renovación: ${fechaRenovacion}</p>` : ''}
      <p style="margin:8px 0 0;color:#F5F5F5;">🚗 Tus coches están desbloqueados en Mi Garaje</p>
      <p style="margin:8px 0 0;color:#F5F5F5;">🏆 Ya puedes inscribirte en campeonatos</p>
    </div>
    ${btnRojo(`${BASE_URL}/campeonatos`, 'Ver campeonatos →')}
  `)
}

export function emailSuscripcionCancelada(username: string): string {
  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">Suscripción cancelada</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 12px;">Hola <strong style="color:#F5F5F5;">${username}</strong>,</p>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 20px;">Tu suscripción APEX ha sido cancelada. Puedes volver a suscribirte en cualquier momento.</p>
    <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="margin:0;color:#AAAAAA;">Si cancelas por error, puedes reactivar tu plan desde la plataforma.</p>
    </div>
    ${btnRojo(`${BASE_URL}/planes`, 'Volver a suscribirse →')}
  `)
}

export function emailCarreraProxima(
  username: string,
  carreraNombre: string,
  campeonatoNombre: string,
  fechaHora: string,
  campeonatoId: string,
  servidorIP?: string | null,
  servidorPassword?: string | null
): string {
  const serverInfo = servidorIP ? `
    <div style="background:#1a1a1a;border:1px solid #333;padding:12px;border-radius:6px;margin-top:12px;">
      <p style="margin:0;color:#AAAAAA;font-size:12px;">SERVIDOR</p>
      <p style="margin:4px 0 0;color:#4ade80;font-family:monospace;">${servidorIP}</p>
      ${servidorPassword ? `<p style="margin:4px 0 0;color:#AAAAAA;font-size:12px;">Contraseña: <code style="color:#fbbf24;">${servidorPassword}</code></p>` : ''}
    </div>
  ` : ''

  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">Mañana tienes carrera ⏱</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 16px;">Hola <strong style="color:#F5F5F5;">${username}</strong>, te recordamos tu próxima carrera:</p>
    <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:0 0 20px;">
      <p style="margin:0;font-size:18px;font-weight:700;color:#F5F5F5;">${carreraNombre}</p>
      <p style="margin:4px 0 0;color:#C0392B;">${campeonatoNombre}</p>
      <p style="margin:8px 0 0;color:#AAAAAA;">🕐 ${fechaHora}</p>
      ${serverInfo}
    </div>
    ${btnRojo(`${BASE_URL}/campeonatos/${campeonatoId}`, 'Ver detalles →')}
  `)
}

export function emailInscripcionConfirmada(username: string, campeonatoNombre: string): string {
  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">Inscripción confirmada 🏁</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 12px;">Hola <strong style="color:#F5F5F5;">${username}</strong>,</p>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 20px;">Tu inscripción al campeonato <strong style="color:#C0392B;">${campeonatoNombre}</strong> ha sido confirmada.</p>
    <p style="color:#AAAAAA;">Te notificaremos cuando se acerque la próxima carrera. ¡Prepárate para competir!</p>
    ${btnRojo(`${BASE_URL}/campeonatos`, 'Ver campeonatos →')}
  `)
}

export function emailResultadoPublicado(
  username: string,
  carreraNombre: string,
  posicion: number,
  puntos: number
): string {
  const posColor = posicion === 1 ? '#F59E0B' : posicion === 2 ? '#9CA3AF' : posicion === 3 ? '#B45309' : '#F5F5F5'
  return baseWrapper(`
    <h2 style="color:#F5F5F5;font-size:22px;margin:0 0 16px;">Resultados publicados 🏆</h2>
    <p style="color:#AAAAAA;line-height:1.6;margin:0 0 16px;">Hola <strong style="color:#F5F5F5;">${username}</strong>,</p>
    <p style="color:#AAAAAA;margin:0 0 16px;">Los resultados de <strong style="color:#C0392B;">${carreraNombre}</strong> han sido publicados.</p>
    <div style="background:#2A2A2A;padding:20px;border-radius:8px;margin:0 0 20px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:900;color:${posColor};">${posicion}º</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#C0392B;">+${puntos} puntos</p>
    </div>
    ${btnRojo(`${BASE_URL}/dashboard`, 'Ver ranking →')}
  `)
}
