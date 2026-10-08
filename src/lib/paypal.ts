import { prisma } from './prisma'
import { TOTAL_PLAZAS_FOUNDER } from './utils'
import { tieneDescuentoReferidoPendiente } from './referidos'

export const PAYPAL_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

// Planes "Normales" — se usan cuando ya se ocuparon las 30 plazas fundadoras.
// Variable oficial: NEXT_PUBLIC_PAYPAL_<PLAN>_NEW_PLAN_ID. Los nombres antiguos
// (PAYPAL_PLAN_<PLAN> y NEXT_PUBLIC_PAYPAL_<PLAN>_PLAN_ID) se aceptan solo como respaldo.
export const PAYPAL_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_NEW_PLAN_ID || process.env.PAYPAL_PLAN_ROOKIE || process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_NEW_PLAN_ID || process.env.PAYPAL_PLAN_AMATEUR || process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_NEW_PLAN_ID || process.env.PAYPAL_PLAN_PRO || process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_NEW_PLAN_ID || process.env.PAYPAL_PLAN_ELITE || process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID || '',
}

// Planes "Fundador" — precios congelados de por vida para los primeros 30 pagadores
export const PAYPAL_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_FOUNDER_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_FOUNDER_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_FOUNDER_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_FOUNDER_PLAN_ID || '',
}

// Planes "Referido" — primer mes con un 10% de descuento para quien se registró con un código.
// Se crean en PayPal con 2 ciclos: TRIAL de 1 mes al precio rebajado + REGULAR al precio normal,
// así PayPal pasa solo al precio completo a partir del segundo mes.
// Fundador: 4.5 / 9 / 13.5 / 22.5 € el primer mes, luego 5 / 10 / 15 / 25 €
export const PAYPAL_REFERIDO_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_REFERIDO_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_REFERIDO_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_REFERIDO_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_REFERIDO_PLAN_ID || '',
}

// Normal (sin plazas fundadoras): 6.3 / 10.8 / 17.1 / 27 € el primer mes, luego 7 / 12 / 19 / 30 €
export const PAYPAL_REFERIDO_NEW_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_REFERIDO_NEW_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_REFERIDO_NEW_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_REFERIDO_NEW_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_REFERIDO_NEW_PLAN_ID || '',
}

/**
 * Cuenta las plazas fundadoras ocupadas y determina si aún quedan disponibles.
 */
export async function getFounderStatus() {
  const fundadoresActuales = await prisma.user.count({ where: { esFounder: true } })
  const plazasRestantes = Math.max(0, TOTAL_PLAZAS_FOUNDER - fundadoresActuales)
  return {
    fundadoresActuales,
    plazasRestantes,
    totalPlazas: TOTAL_PLAZAS_FOUNDER,
    hayPlazasDisponibles: fundadoresActuales < TOTAL_PLAZAS_FOUNDER,
  }
}

/**
 * Resuelve el Plan ID de PayPal a usar para un plan dado.
 * - Si el usuario ya es fundador, siempre recibe el Plan ID Fundador del nuevo tier
 *   (nunca se le asigna un plan normal, incluso si ya no quedan plazas).
 * - Si no es fundador, se le asigna Fundador mientras queden plazas libres, o Normal en caso contrario.
 * - Si se registró con un código de referido y aún no ha pagado nunca, se usa la variante "Referido"
 *   (primer mes -10%) siempre que su Plan ID esté configurado.
 */
export async function getPlanId(
  plan: string,
  userId?: string
): Promise<{ planId: string; esFounder: boolean; descuentoReferido: boolean }> {
  let esFounder: boolean
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { esFounder: true } })
    esFounder = !!user?.esFounder || (await getFounderStatus()).hayPlazasDisponibles
  } else {
    esFounder = (await getFounderStatus()).hayPlazasDisponibles
  }

  const planId = esFounder ? (PAYPAL_FOUNDER_PLAN_IDS[plan] || '') : (PAYPAL_PLAN_IDS[plan] || '')

  if (userId && await tieneDescuentoReferidoPendiente(userId)) {
    const planReferido = esFounder ? PAYPAL_REFERIDO_FOUNDER_PLAN_IDS[plan] : PAYPAL_REFERIDO_NEW_PLAN_IDS[plan]
    if (planReferido) return { planId: planReferido, esFounder, descuentoReferido: true }
  }

  return { planId, esFounder, descuentoReferido: false }
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
