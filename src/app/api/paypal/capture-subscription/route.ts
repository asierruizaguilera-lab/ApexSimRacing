import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPayPalSubscription, getPlanId } from '@/lib/paypal'
import { activarPlan } from '@/lib/suscripciones'
import { sendEmail, emailSuscripcionActiva } from '@/lib/email'
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

    // Re-verificamos las plazas fundadoras en el momento de la confirmación (protección de condición de carrera).
    // Si alguien se adelantó y ya no quedan plazas, se activa igual pero con precio normal.
    const { esFounder } = await getPlanId(plan, session.user.id)

    const { precio, fechaRenovacion } = await activarPlan(session.user.id, plan as PlanSuscripcion, {
      paypalSubscriptionId: subscriptionId,
      esFounder,
    })

    // Email de confirmación (async, no bloquea)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, username: true },
    })
    if (user) {
      sendEmail({
        to: user.email,
        subject: `Tu plan ${plan} está activo — ¡A competir!`,
        html: emailSuscripcionActiva(
          user.username,
          plan,
          precio,
          fechaRenovacion.toLocaleDateString('es-ES'),
          esFounder
        ),
      }).catch(() => null)
    }

    return NextResponse.json({ ok: true, plan, esFounder })
  } catch (err) {
    console.error('[PayPal capture-subscription]', err)
    return NextResponse.json({ error: 'Error al activar la suscripción' }, { status: 500 })
  }
}
