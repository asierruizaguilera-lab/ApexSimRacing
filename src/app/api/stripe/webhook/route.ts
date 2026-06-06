import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { activarPlan, cancelarSuscripcion } from '@/lib/suscripciones'
import { sendEmail } from '@/lib/email'
import type { PlanSuscripcion } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Firma de webhook no configurada' }, { status: 400 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Stripe Webhook] Firma inválida:', err)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as any
        const userId = checkoutSession.metadata?.userId
        const plan = checkoutSession.metadata?.plan as PlanSuscripcion

        if (!userId || !plan) break

        const subscriptionId = checkoutSession.subscription as string
        const customerId = checkoutSession.customer as string

        await activarPlan(userId, plan, {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
        })

        // Email de confirmación
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, username: true },
        })
        if (user) {
          sendEmail({
            to: user.email,
            subject: `¡Bienvenido al plan ${plan}! — APEX SimRacing`,
            html: emailSuscripcionActivaHTML(user.username, plan),
          }).catch(() => null)
        }

        // Emitir evento via Socket.io
        const io = (global as any).io
        if (io) io.to(userId).emit('suscripcion:activada', { plan })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const userId = subscription.metadata?.userId

        if (!userId) break

        if (subscription.status === 'active') {
          const plan = subscription.metadata?.plan as PlanSuscripcion
          if (plan) {
            await activarPlan(userId, plan, {
              stripeSubscriptionId: subscription.id,
              stripeCustomerId: subscription.customer,
            })
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const userId = subscription.metadata?.userId
        if (userId) await cancelarSuscripcion(userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any
        const customerId = invoice.customer as string

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })
        if (user) {
          await prisma.suscripcion.updateMany({
            where: { userId: user.id, estado: 'ACTIVA' },
            data: { estado: 'EXPIRADA' },
          })
          await prisma.notificacion.create({
            data: {
              userId: user.id,
              tipo: 'SUSCRIPCION_CANCELADA',
              mensaje: 'El pago de tu suscripción ha fallado. Por favor actualiza tu método de pago.',
              link: '/planes',
            },
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error procesando evento:', event.type, err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function emailSuscripcionActivaHTML(username: string, plan: string): string {
  return `
    <div style="font-family:sans-serif;background:#1C1C1C;color:#F5F5F5;padding:32px;max-width:600px;margin:0 auto;border-radius:8px;">
      <h1 style="color:#C0392B;font-size:28px;margin:0 0 8px;">APEX SimRacing</h1>
      <h2 style="color:#F5F5F5;font-size:20px;margin:0 0 24px;">¡Plan Activado!</h2>
      <p>Hola <strong>${username}</strong>,</p>
      <p>Tu plan <strong style="color:#C0392B;">${plan}</strong> está activo. Ya puedes inscribirte en campeonatos y ver tus coches desbloqueados en el garaje.</p>
      <p>¡Nos vemos en pista! 🏁</p>
      <hr style="border-color:#333;margin:24px 0;"/>
      <p style="color:#888;font-size:12px;">APEX SimRacing — La comunidad hispanohablante de SimRacing</p>
    </div>
  `
}
