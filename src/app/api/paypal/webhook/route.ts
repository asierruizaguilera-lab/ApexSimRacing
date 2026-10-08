import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activarPlan, cancelarSuscripcion } from '@/lib/suscripciones'
import { getPlanId, verificarWebhookPayPal } from '@/lib/paypal'
import { vincularReferido, registrarComisionPago, desactivarUsoReferido } from '@/lib/referidos'
import { sendEmail, emailSuscripcionActiva, emailSuscripcionCancelada } from '@/lib/email'
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

  // Con PAYPAL_WEBHOOK_ID configurado se rechaza cualquier evento sin firma válida.
  // Sin él se mantiene el comportamiento anterior, pero NO se acumulan comisiones de referido
  // (cualquiera podría falsificar un PAYMENT.SALE.COMPLETED y generarse saldo).
  const verificado = await verificarWebhookPayPal(req.headers, body)
  if (verificado === false) {
    console.warn('[PayPal Webhook] Firma inválida — evento ignorado:', eventType)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

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
          // Recalculamos el estado fundador en el momento de la activación (idempotente: si el
          // usuario ya es fundador, getPlanId siempre devuelve esFounder=true independientemente de las plazas restantes).
          const { esFounder } = await getPlanId(plan, userId)
          const { precio, fechaRenovacion } = await activarPlan(userId, plan as PlanSuscripcion, {
            paypalSubscriptionId: resource.id,
            esFounder,
          })
          await vincularReferido(userId).catch(err => console.error('[PayPal Webhook] vincularReferido', err))
          const user = await getUserForNotification(userId)
          if (user) {
            sendEmail({
              to: user.email,
              subject: `Tu plan ${plan} está activo — ¡A competir!`,
              html: emailSuscripcionActiva(user.username, plan, precio, fechaRenovacion.toLocaleDateString('es-ES'), esFounder),
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
          await desactivarUsoReferido(userId)
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

          // Comisión de referido: 12% del precio del plan durante los primeros 12 pagos
          if (verificado) {
            const sub = await prisma.suscripcion.findUnique({
              where: { paypalSubscriptionId: billingAgreementId },
              select: { userId: true, precioMensual: true },
            })
            if (sub) await registrarComisionPago(sub.userId, resource.id, sub.precioMensual)
          } else {
            console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID no configurado — comisiones de referido desactivadas')
          }
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
