import { NextResponse } from 'next/server'
import { logActividad } from './actividad'

// Rate limit en memoria (una sola instancia en Render). Ventana fija por clave.
// El límite general de la API (120/min por IP) vive en server.js; aquí van los límites específicos
// de login, registro y recuperación de contraseña.

interface Cubo { n: number; reinicio: number }
const cubos = new Map<string, Cubo>()
const MAX_CLAVES = 20_000

function limpiar(ahora: number) {
  if (cubos.size < MAX_CLAVES) return
  cubos.forEach((c, k) => { if (c.reinicio <= ahora) cubos.delete(k) })
  if (cubos.size >= MAX_CLAVES) cubos.clear()
}

export interface Limite { max: number; ventanaMs: number }

export const LIMITES = {
  loginFallido: { max: 5, ventanaMs: 15 * 60 * 1000 },
  registro: { max: 5, ventanaMs: 60 * 60 * 1000 },
  recuperar: { max: 5, ventanaMs: 60 * 60 * 1000 },
} satisfies Record<string, Limite>

/** ¿La clave ya agotó su cupo? (no consume) */
export function bloqueado(clave: string, limite: Limite): boolean {
  const c = cubos.get(clave)
  return !!c && c.reinicio > Date.now() && c.n >= limite.max
}

/** Suma un intento. Devuelve true si con este se supera el límite. */
export function consumir(clave: string, limite: Limite): boolean {
  const ahora = Date.now()
  limpiar(ahora)
  const c = cubos.get(clave)
  if (!c || c.reinicio <= ahora) {
    cubos.set(clave, { n: 1, reinicio: ahora + limite.ventanaMs })
    return 1 > limite.max
  }
  c.n++
  return c.n > limite.max
}

export function reiniciar(clave: string) {
  cubos.delete(clave)
}

export function segundosRestantes(clave: string): number {
  const c = cubos.get(clave)
  return c ? Math.max(1, Math.ceil((c.reinicio - Date.now()) / 1000)) : 0
}

/** Respuesta 429 estándar + log SEGURIDAD. */
export function respuesta429(clave: string, motivo: string, extra: { ruta?: string; ip?: string | null; userAgent?: string | null } = {}) {
  logActividad({ tipo: 'SEGURIDAD', estado: 429, ruta: extra.ruta, ip: extra.ip, userAgent: extra.userAgent, detalle: { motivo } })
  const s = segundosRestantes(clave)
  return NextResponse.json(
    { error: 'Demasiados intentos. Inténtalo de nuevo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(s || 60) } }
  )
}
