import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelPayPalSubscription } from '@/lib/paypal'
import { cancelarSuscripcion } from '@/lib/suscripciones'
import { desactivarUsoReferido } from '@/lib/referidos'
import { emailSuscripcionCancelada } from '@/lib/email'
import { enviarConfirmacion } from '@/lib/mail/confirmaciones'

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { userId: session.user.id, estado: { in: ['ACTIVA', 'GRATUITA'] } },
  })

  if (!suscripcion) return NextResponse.json({ error: 'No tienes suscripción activa' }, { status: 404 })

  // Cancelar en PayPal si existe
  if (suscripcion.paypalSubscriptionId) {
    await cancelPayPalSubscription(suscripcion.paypalSubscriptionId).catch(() => null)
  }

  await cancelarSuscripcion(session.user.id)
  await desactivarUsoReferido(session.user.id)

  // Email de confirmación (no bloquea). Misma referencia que el webhook CANCELLED: sale uno solo.
  // Si paypalSubscriptionId es nulo (p. ej. suscripción GRATUITA) no hay suscripción en PayPal, así que PayPal
  // nunca mandará un webhook con resource.id para ella: no hay referencia del webhook con la que coincidir.
  // Se usa el id interno de la suscripción para que, aun así, solo salga un email por cancelación.
  void enviarConfirmacion(session.user.id, `suscripcion_cancelada:${suscripcion.paypalSubscriptionId ?? suscripcion.id}`, u => ({
    subject: 'Tu suscripción APEX ha sido cancelada',
    html: emailSuscripcionCancelada(u.username),
  })).catch(() => null)

  return NextResponse.json({ ok: true })
}
