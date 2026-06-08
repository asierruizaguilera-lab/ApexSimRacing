import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PAYPAL_BASE, PAYPAL_PLAN_IDS, getPayPalAccessToken } from '@/lib/paypal'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { plan } = await req.json()
  const planId = PAYPAL_PLAN_IDS[plan]
  if (!planId) return NextResponse.json({ error: 'Plan de PayPal no configurado' }, { status: 400 })

  try {
    const token = await getPayPalAccessToken()
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `apex-${session.user.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        custom_id: JSON.stringify({ userId: session.user.id, plan }),
        application_context: {
          brand_name: 'APEX SimRacing',
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${baseUrl}/planes?success=1&plan=${plan}&provider=paypal`,
          cancel_url: `${baseUrl}/planes?cancelled=1`,
        },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[PayPal create-subscription]', data)
      return NextResponse.json({ error: 'Error creando suscripción en PayPal' }, { status: 500 })
    }

    const approveLink = data.links?.find((l: any) => l.rel === 'approve')?.href
    return NextResponse.json({ approveUrl: approveLink, subscriptionId: data.id })
  } catch (err) {
    console.error('[PayPal create-subscription]', err)
    return NextResponse.json({ error: 'Error de conexión con PayPal' }, { status: 500 })
  }
}
