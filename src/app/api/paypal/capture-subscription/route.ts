import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPayPalSubscription, getPlanId } from '@/lib/paypal'
import { activarPlan } from '@/lib/suscripciones'
import { vincularReferido } from '@/lib/referidos'
import { sendEmail, emailSuscripcionActiva } from '@/lib/email'
import type { PlanSuscripcion } from '@prisma/client'
import { logActividad, datosCliente } from '@/lib/actividad'

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

    // Re-verificamos la elegibilidad Founder en el momento de la confirmación (protección de condición de
    // carrera): si la ventana cerró mientras pagaba, se activa igual pero con precio estándar.
    const { precioFounder: esFounder } = await getPlanId(session.user.id, plan)

    const { precio, fechaRenovacion } = await activarPlan(session.user.id, plan as PlanSuscripcion, {
      paypalSubscriptionId: subscriptionId,
      esFounder,
    })

    logActividad({
      tipo: 'PAGO',
      userId: session.user.id,
      ruta: '/api/paypal/capture-subscription',
      metodo: 'POST',
      ...datosCliente(req),
      detalle: { evento: 'suscripcion_capturada', plan, precio, founder: esFounder },
    })

    // Si se registró con un código de referido, el primer pago lo vincula con su referidor
    await vincularReferido(session.user.id).catch(err => console.error('[PayPal capture] vincularReferido', err))
    // El 20% de transición desde un Equipo Founder solo aplica al primer plan individual
    await prisma.user.update({ where: { id: session.user.id }, data: { descuentoTransicionEquipo: false } })

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
