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
      from: 'APEX SimRacing <noreply@apex.gg>',
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

export function emailInscripcionConfirmada(username: string, campeonatoNombre: string): string {
  return `
    <div style="font-family:sans-serif;background:#1C1C1C;color:#F5F5F5;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;">
      <h1 style="color:#C0392B;font-size:28px;margin:0 0 8px;">APEX SimRacing</h1>
      <h2 style="color:#F5F5F5;font-size:20px;margin:0 0 24px;">Inscripción Confirmada</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Tu inscripción al campeonato <strong style="color:#C0392B;">${campeonatoNombre}</strong> ha sido confirmada.</p>
      <p>Prepárate para competir. Te notificaremos cuando se acerque la próxima carrera.</p>
      <p>¡Nos vemos en pista! 🏁</p>
      <hr style="border-color:#333;margin:24px 0;"/>
      <p style="color:#888;font-size:12px;">APEX SimRacing — La comunidad hispanohablante de SimRacing</p>
    </div>
  `
}

export function emailResultadoPublicado(username: string, carreraNombre: string, posicion: number, puntos: number): string {
  return `
    <div style="font-family:sans-serif;background:#1C1C1C;color:#F5F5F5;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;">
      <h1 style="color:#C0392B;font-size:28px;margin:0 0 8px;">APEX SimRacing</h1>
      <h2 style="color:#F5F5F5;font-size:20px;margin:0 0 24px;">Resultados Publicados</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Los resultados de <strong style="color:#C0392B;">${carreraNombre}</strong> han sido publicados.</p>
      <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:0;font-size:18px;">Posición: <strong style="color:#F59E0B;">${posicion}º</strong></p>
        <p style="margin:8px 0 0;font-size:18px;">Puntos obtenidos: <strong style="color:#C0392B;">+${puntos}</strong></p>
      </div>
      <p>¡Sigue compitiendo para subir en el ranking! 🏆</p>
      <hr style="border-color:#333;margin:24px 0;"/>
      <p style="color:#888;font-size:12px;">APEX SimRacing — La comunidad hispanohablante de SimRacing</p>
    </div>
  `
}

export function emailSuscripcionActiva(username: string, plan: string, precio: number): string {
  return `
    <div style="font-family:sans-serif;background:#1C1C1C;color:#F5F5F5;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;">
      <h1 style="color:#C0392B;font-size:28px;margin:0 0 8px;">APEX SimRacing</h1>
      <h2 style="color:#F5F5F5;font-size:20px;margin:0 0 24px;">¡Tu plan está activo!</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Tu suscripción al plan <strong style="color:#C0392B;">${plan}</strong> (${precio}€/mes) está ahora activa.</p>
      <div style="background:#2A2A2A;padding:16px;border-radius:8px;margin:16px 0;">
        <p style="margin:0;">✅ Ya puedes inscribirte en campeonatos</p>
        <p style="margin:8px 0 0;">🚗 Tus coches están desbloqueados en Mi Garaje</p>
        <p style="margin:8px 0 0;">🏆 Compite y sube en el ranking global</p>
      </div>
      <p>¡Nos vemos en pista! 🏁</p>
      <hr style="border-color:#333;margin:24px 0;"/>
      <p style="color:#888;font-size:12px;">APEX SimRacing — La comunidad hispanohablante de SimRacing</p>
    </div>
  `
}
