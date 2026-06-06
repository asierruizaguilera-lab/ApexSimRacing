import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activarPlan, cancelarSuscripcion } from '@/lib/suscripciones'
import type { PlanSuscripcion } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const eventType = body.event_type

  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const resource = body.resource
        let customData: { userId?: string; plan?: string } = {}
        try { customData = JSON.parse(resource.custom_id || '{}') } catch {}
        if (customData.userId && customData.plan) {
          await activarPlan(customData.userId, customData.plan as PlanSuscripcion, {
            paypalSubscriptionId: resource.id,
          })
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const resource = body.resource
        let customData: { userId?: string } = {}
        try { customData = JSON.parse(resource.custom_id || '{}') } catch {}
        if (customData.userId) await cancelarSuscripcion(customData.userId)

        // También buscar por subscriptionId como fallback
        if (!customData.userId && resource.id) {
          const sub = await prisma.suscripcion.findUnique({
            where: { paypalSubscriptionId: resource.id },
          })
          if (sub) await cancelarSuscripcion(sub.userId)
        }
        break
      }

      case 'PAYMENT.SALE.COMPLETED': {
        // Renovación mensual exitosa — actualizar fechaRenovacion
        const resource = body.resource
        const billingAgreementId = resource.billing_agreement_id
        if (billingAgreementId) {
          const fechaRenovacion = new Date()
          fechaRenovacion.setMonth(fechaRenovacion.getMonth() + 1)
          await prisma.suscripcion.updateMany({
            where: { paypalSubscriptionId: billingAgreementId },
            data: { fechaRenovacion },
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('[PayPal Webhook] Error:', eventType, err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
