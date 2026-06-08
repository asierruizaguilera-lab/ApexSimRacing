import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activarPlan, cancelarSuscripcion } from '@/lib/suscripciones'
import { sendEmail, emailSuscripcionActiva, emailSuscripcionCancelada } from '@/lib/email'
import { PLAN_PRECIOS } from '@/lib/utils'
import type { PlanSuscripcion } from '@prisma/client'

export const dynamic = 'force-dynamic'

async function getUserForNotification(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const eventType = body.event_type

  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const resource = body.resource
        let userId: string | undefined
        let plan: string | undefined

        // Intentar leer custom_id (set cuando se usa el backend create-subscription)
        try {
          const customData = JSON.parse(resource.custom_id || '{}')
          userId = customData.userId
          plan = customData.plan
        } catch {}

        // Fallback: buscar en BD por subscriptionId
        if (!userId && resource.id) {
          const sub = await prisma.suscripcion.findFirst({
            where: { paypalSubscriptionId: resource.id },
          })
          if (sub) { userId = sub.userId; plan = sub.plan }
        }

        if (userId && plan) {
          await activarPlan(userId, plan as PlanSuscripcion, {
            paypalSubscriptionId: resource.id,
          })
          const user = await getUserForNotification(userId)
          if (user) {
            sendEmail({
              to: user.email,
              subject: `Tu plan ${plan} está activo — ¡A competir!`,
              html: emailSuscripcionActiva(user.username, plan, PLAN_PRECIOS[plan] ?? 0),
            }).catch(() => null)
          }
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED': {
        const resource = body.resource
        let userId: string | undefined
        try {
          const customData = JSON.parse(resource.custom_id || '{}')
          userId = customData.userId
        } catch {}

        if (!userId && resource.id) {
          const sub = await prisma.suscripcion.findFirst({
            where: { paypalSubscriptionId: resource.id },
          })
          if (sub) userId = sub.userId
        }

        if (userId) {
          await cancelarSuscripcion(userId)
          const user = await getUserForNotification(userId)
          if (user) {
            sendEmail({
              to: user.email,
              subject: 'Tu suscripción APEX ha sido cancelada',
              html: emailSuscripcionCancelada(user.username),
            }).catch(() => null)
          }
        }
        break
      }

      case 'PAYMENT.SALE.COMPLETED': {
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
