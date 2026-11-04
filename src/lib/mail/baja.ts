import { createHmac, timingSafeEqual } from 'node:crypto'
import { mailConfig } from './config'

function firma(userId: string, secret: string) {
  return createHmac('sha256', secret).update(userId).digest('base64url')
}

export function firmarBaja(userId: string): string | null {
  const secret = mailConfig().unsubscribeSecret
  if (!secret) return null
  const value = `${userId}.${firma(userId, secret)}`
  return Buffer.from(value).toString('base64url')
}

export function verificarBaja(token: string): string | null {
  const secret = mailConfig().unsubscribeSecret
  if (!secret) return null
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const dot = decoded.lastIndexOf('.')
    if (dot < 1) return null
    const userId = decoded.slice(0, dot)
    const actual = Buffer.from(decoded.slice(dot + 1))
    const expected = Buffer.from(firma(userId, secret))
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null
    return userId
  } catch { return null }
}

export function urlBaja(userId: string): string | null {
  const token = firmarBaja(userId)
  const base = mailConfig().nextAuthUrl
  return token && base ? `${base}/api/unsubscribe?token=${encodeURIComponent(token)}` : null
}
