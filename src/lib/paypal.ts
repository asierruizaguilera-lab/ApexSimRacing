import { prisma } from './prisma'
import { TOTAL_PLAZAS_FOUNDER } from './utils'

export const PAYPAL_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com'

// Planes "Normales" — se usan cuando ya se ocuparon las 60 plazas fundadoras.
// Accepts both PAYPAL_PLAN_* (server-only) and NEXT_PUBLIC_PAYPAL_*_PLAN_ID (server+client)
export const PAYPAL_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.PAYPAL_PLAN_ROOKIE || process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_PLAN_ID || '',
  AMATEUR: process.env.PAYPAL_PLAN_AMATEUR || process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_PLAN_ID || '',
  PRO: process.env.PAYPAL_PLAN_PRO || process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID || '',
  ELITE: process.env.PAYPAL_PLAN_ELITE || process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID || '',
}

// Planes "Fundador" — precios congelados de por vida para los primeros 60 pagadores
export const PAYPAL_FOUNDER_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_FOUNDER_PLAN_ID || '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_FOUNDER_PLAN_ID || '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_FOUNDER_PLAN_ID || '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_FOUNDER_PLAN_ID || '',
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
 */
export async function getPlanId(plan: string, userId?: string): Promise<{ planId: string; esFounder: boolean }> {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { esFounder: true } })
    if (user?.esFounder) {
      return { planId: PAYPAL_FOUNDER_PLAN_IDS[plan] || '', esFounder: true }
    }
  }

  const { hayPlazasDisponibles } = await getFounderStatus()

  return {
    planId: hayPlazasDisponibles ? (PAYPAL_FOUNDER_PLAN_IDS[plan] || '') : (PAYPAL_PLAN_IDS[plan] || ''),
    esFounder: hayPlazasDisponibles,
  }
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
