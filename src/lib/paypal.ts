const PAYPAL_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// Accepts both PAYPAL_PLAN_* (server-only) and NEXT_PUBLIC_PAYPAL_*_PLAN_ID (server+client)
export const PAYPAL_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.PAYPAL_PLAN_ROOKIE || process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_PLAN_ID || '',
  AMATEUR: process.env.PAYPAL_PLAN_AMATEUR || process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_PLAN_ID || '',
  PRO: process.env.PAYPAL_PLAN_PRO || process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID || '',
  ELITE: process.env.PAYPAL_PLAN_ELITE || process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID || '',
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
