import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-11-20.acacia',
})

export const STRIPE_PRICE_IDS: Record<string, string> = {
  ROOKIE: process.env.STRIPE_PRICE_ROOKIE ?? '',
  AMATEUR: process.env.STRIPE_PRICE_AMATEUR ?? '',
  PRO: process.env.STRIPE_PRICE_PRO ?? '',
  ELITE: process.env.STRIPE_PRICE_ELITE ?? '',
}

export const PLAN_PRECIOS_CENTS: Record<string, number> = {
  ROOKIE: 500,
  AMATEUR: 1000,
  PRO: 1800,
  ELITE: 2500,
}
