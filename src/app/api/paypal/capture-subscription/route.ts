import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPayPalSubscription } from '@/lib/paypal'
import { activarPlan } from '@/lib/suscripciones'
import type { PlanSuscripcion } from '@prisma/client'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { subscriptionId, plan } = await req.json()
  if (!subscriptionId || !plan) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })

  try {
    // Verificar estado de la suscripción en PayPal
    const ppSub = await getPayPalSubscription(subscriptionId)
    if (!ppSub || !['ACTIVE', 'APPROVED'].includes(ppSub.status)) {
      return NextResponse.json({ error: 'La suscripción de PayPal no está activa' }, { status: 400 })
    }

    await activarPlan(session.user.id, plan as PlanSuscripcion, {
      paypalSubscriptionId: subscriptionId,
    })

    return NextResponse.json({ ok: true, plan })
  } catch (err) {
    console.error('[PayPal capture-subscription]', err)
    return NextResponse.json({ error: 'Error al activar la suscripción' }, { status: 500 })
  }
}
