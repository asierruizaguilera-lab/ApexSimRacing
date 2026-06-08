import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPayPalSubscription } from '@/lib/paypal'
import { activarPlan } from '@/lib/suscripciones'
import { sendEmail, emailSuscripcionActiva } from '@/lib/email'
import { PLAN_PRECIOS } from '@/lib/utils'
import type { PlanSuscripcion } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { subscriptionId, plan } = await req.json()
  if (!subscriptionId || !plan) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  try {
    // Verificar estado con la API de PayPal (solo si hay credenciales de backend)
    if (process.env.PAYPAL_CLIENT_SECRET) {
      const ppSub = await getPayPalSubscription(subscriptionId)
      if (!ppSub || !['ACTIVE', 'APPROVED'].includes(ppSub.status)) {
        return NextResponse.json({ error: 'La suscripción de PayPal no está activa' }, { status: 400 })
      }
    }

    await activarPlan(session.user.id, plan as PlanSuscripcion, {
      paypalSubscriptionId: subscriptionId,
    })

    // Email de confirmación (async, no bloquea)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, username: true },
    })
    if (user) {
      const fechaRenovacion = new Date()
      fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1)
      sendEmail({
        to: user.email,
        subject: `Tu plan ${plan} está activo — ¡A competir!`,
        html: emailSuscripcionActiva(
          user.username,
          plan,
          PLAN_PRECIOS[plan] ?? 0,
          fechaRenovacion.toLocaleDateString('es-ES')
        ),
      }).catch(() => null)
    }

    return NextResponse.json({ ok: true, plan })
  } catch (err) {
    console.error('[PayPal capture-subscription]', err)
    return NextResponse.json({ error: 'Error al activar la suscripción' }, { status: 500 })
  }
}
