import { prisma } from './prisma'
import { tieneDescuentoReferidoPendiente } from './referidos'
import { getVentanaFounderUsuario } from './iniciacion'
import { esMiembroEquipoFounder } from './equipos'

export const PAYPAL_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

// Planes estándar. Variable oficial: NEXT_PUBLIC_PAYPAL_<PLAN>_NEW_PLAN_ID. Los nombres antiguos
// (PAYPAL_PLAN_<PLAN> y NEXT_PUBLIC_PAYPAL_<PLAN>_PLAN_ID) se aceptan solo como respaldo.
export const PAYPAL_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_NEW_PLAN_ID || process.env.PAYPAL_PLAN_ROOKIE || process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_NEW_PLAN_ID || process.env.PAYPAL_PLAN_AMATEUR || process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_NEW_PLAN_ID || process.env.PAYPAL_PLAN_PRO || process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_NEW_PLAN_ID || process.env.PAYPAL_PLAN_ELITE || process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID || '',
}

// Planes "Founder" — precio congelado de por vida para quien paga dentro de la ventana Founder
export const PAYPAL_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_FOUNDER_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_FOUNDER_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_FOUNDER_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_FOUNDER_PLAN_ID || '',
}

// Planes "Referido" — primer mes con un 10% de descuento para quien se registró con un código.
// Se crean en PayPal con 2 ciclos: TRIAL de 1 mes al precio rebajado + REGULAR al precio normal,
// así PayPal pasa solo al precio completo a partir del segundo mes.
// Founder: 4.5 / 9 / 13.5 / 22.5 € el primer mes, luego 5 / 10 / 15 / 25 €
export const PAYPAL_REFERIDO_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_REFERIDO_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_REFERIDO_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_REFERIDO_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_REFERIDO_PLAN_ID || '',
}

// Estándar: 6.3 / 10.8 / 17.1 / 27 € el primer mes, luego 7 / 12 / 19 / 30 €
export const PAYPAL_REFERIDO_NEW_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_REFERIDO_NEW_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_REFERIDO_NEW_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_REFERIDO_NEW_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_REFERIDO_NEW_PLAN_ID || '',
}

// Planes "Transición de equipo" — primer mes -20% para quien viene de un Equipo Founder.
// Mismo esquema TRIAL + REGULAR que los de referido. Founder: 4 / 8 / 12 / 20 €; estándar: 5.6 / 9.6 / 15.2 / 24 €
export const PAYPAL_EQUIPO20_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_EQUIPO20_FOUNDER_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_EQUIPO20_FOUNDER_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_EQUIPO20_FOUNDER_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_EQUIPO20_FOUNDER_PLAN_ID || '',
}

export const PAYPAL_EQUIPO20_NEW_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_EQUIPO20_NEW_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_EQUIPO20_NEW_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_EQUIPO20_NEW_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_EQUIPO20_NEW_PLAN_ID || '',
}

// Plan de equipo (lo paga el líder). Se rellenan cuando estén creados en PayPal.
export const PAYPAL_EQUIPO_PLAN_IDS: Record<'FOUNDER' | 'ESTANDAR', string> = {
  FOUNDER: process.env.NEXT_PUBLIC_PAYPAL_EQUIPO_FOUNDER_PLAN_ID || '',
  ESTANDAR: process.env.NEXT_PUBLIC_PAYPAL_EQUIPO_ESTANDAR_PLAN_ID || '',
}

/**
 * Situación Founder de un usuario:
 * - `founderActivo`: ya es Founder y mantiene su suscripción Founder activa → conserva el precio
 *   bloqueado al cambiar de tier.
 * - `esElegibleFounder`: está inscrito en una temporada de iniciación con la ventana Founder abierta.
 * Un Founder que canceló pierde el precio para siempre: no vuelve a ser elegible aunque la ventana siga abierta.
 */
export async function getEstadoFounder(userId: string) {
  const [user, suscripcion] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { esFounder: true } }),
    prisma.suscripcion.findUnique({ where: { userId }, select: { estado: true, esFounder: true } }),
  ])
  const esFounder = !!user?.esFounder
  const founderActivo = esFounder && !!suscripcion?.esFounder && suscripcion.estado === 'ACTIVA'

  const ventana = esFounder ? null : await getVentanaFounderUsuario(userId)
  return {
    esFounder,
    founderActivo,
    esElegibleFounder: !!ventana,
    ventanaExpira: ventana?.ventanaFounderExpira ?? null,
  }
}

/**
 * Resuelve el Plan ID de PayPal a usar para un plan dado.
 * - Precio Founder si el usuario es elegible (ventana abierta) o si ya es Founder con la suscripción activa.
 * - Primer mes con descuento: 20% si viene de un Equipo Founder, o 10% si se registró con un código de
 *   referido. No son acumulables: se aplica solo el mayor (y solo si su Plan ID está configurado).
 */
export async function getPlanId(
  userId: string,
  plan: string
): Promise<{ planId: string; esElegibleFounder: boolean; precioFounder: boolean; descuentoReferido: boolean; descuentoTransicionEquipo: boolean }> {
  const { founderActivo, esElegibleFounder } = await getEstadoFounder(userId)
  const precioFounder = founderActivo || esElegibleFounder
  const base = {
    esElegibleFounder,
    precioFounder,
    descuentoReferido: false,
    descuentoTransicionEquipo: false,
  }

  if (await tieneDescuentoTransicionEquipo(userId)) {
    const planEquipo = precioFounder ? PAYPAL_EQUIPO20_FOUNDER_PLAN_IDS[plan] : PAYPAL_EQUIPO20_NEW_PLAN_IDS[plan]
    if (planEquipo) return { ...base, planId: planEquipo, descuentoTransicionEquipo: true }
  }

  if (await tieneDescuentoReferidoPendiente(userId)) {
    const planReferido = precioFounder ? PAYPAL_REFERIDO_FOUNDER_PLAN_IDS[plan] : PAYPAL_REFERIDO_NEW_PLAN_IDS[plan]
    if (planReferido) return { ...base, planId: planReferido, descuentoReferido: true }
  }

  const planId = precioFounder ? (PAYPAL_FOUNDER_PLAN_IDS[plan] || '') : (PAYPAL_PLAN_IDS[plan] || '')
  return { ...base, planId }
}

/** 20% en el primer plan individual: viene de un Equipo Founder (o sigue en él) y aún no ha pagado un plan propio. */
export async function tieneDescuentoTransicionEquipo(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { descuentoTransicionEquipo: true, suscripcion: { select: { paypalSubscriptionId: true } } },
  })
  if (!user || user.suscripcion?.paypalSubscriptionId) return false
  return user.descuentoTransicionEquipo || await esMiembroEquipoFounder(userId)
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured')

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description || 'PayPal auth failed')
  return data.access_token
}

export async function getPayPalSubscription(subscriptionId: string) {
  const token = await getPayPalAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function cancelPayPalSubscription(subscriptionId: string) {
  const token = await getPayPalAccessToken()
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: 'Cancelled by user' }),
  })
  return res.ok
}

/**
 * Verifica la firma de un webhook con la API de PayPal. Requiere PAYPAL_WEBHOOK_ID
 * (ID del webhook en el dashboard de PayPal). Devuelve null si no está configurado.
 */
export async function verificarWebhookPayPal(headers: Headers, body: unknown): Promise<boolean | null> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID
  if (!webhookId) return null
  try {
    const token = await getPayPalAccessToken()
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: body,
      }),
    })
    const data = await res.json()
    return res.ok && data.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('[PayPal verify-webhook]', err)
    return false
  }
}
