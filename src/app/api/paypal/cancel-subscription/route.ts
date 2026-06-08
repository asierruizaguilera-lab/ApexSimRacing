import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cancelPayPalSubscription } from '@/lib/paypal'
import { cancelarSuscripcion } from '@/lib/suscripciones'
import { sendEmail, emailSuscripcionCancelada } from '@/lib/email'

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

  // Email de confirmación (async)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, username: true },
  })
  if (user) {
    sendEmail({
      to: user.email,
      subject: 'Tu suscripción APEX ha sido cancelada',
      html: emailSuscripcionCancelada(user.username),
    }).catch(() => null)
  }

  return NextResponse.json({ ok: true })
}
