import { createHash } from 'crypto'
import type { Prisma, TipoActividad } from '@prisma/client'
import { prisma } from './prisma'

// Log de actividad: todo es fire-and-forget y nunca lanza. Un fallo al registrar jamás debe romper
// la petición que lo origina. NUNCA pasar aquí contraseñas, tokens, bodies ni mensajes de chat.

export interface DatosActividad {
  tipo: TipoActividad
  userId?: string | null
  ruta?: string | null
  metodo?: string | null
  estado?: number | null
  ip?: string | null
  userAgent?: string | null
  detalle?: Prisma.InputJsonValue
}

/** IPv4 → /24, IPv6 → /48, y después sha256 con LOG_SALT. Sin LOG_SALT no se guarda nada. */
export function hashIp(ip: string | null | undefined): string | null {
  const salt = process.env.LOG_SALT
  if (!ip || !salt) return null
  let limpia = ip.trim().replace(/^::ffff:/, '')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(limpia)) {
    limpia = limpia.split('.').slice(0, 3).join('.') + '.0'
  } else if (limpia.includes(':')) {
    limpia = limpia.split(':').slice(0, 3).join(':') + '::'
  } else {
    return null
  }
  return createHash('sha256').update(salt + limpia).digest('hex').slice(0, 32)
}

type ConHeaders = { headers: Headers | Record<string, string | string[] | undefined> }

function leerHeader(req: ConHeaders, nombre: string): string | null {
  const h = req.headers
  if (typeof (h as Headers).get === 'function') return (h as Headers).get(nombre)
  const v = (h as Record<string, string | string[] | undefined>)[nombre]
  return Array.isArray(v) ? v[0] ?? null : v ?? null
}

/** IP del cliente (primera de x-forwarded-for: Render va detrás de proxy) y user-agent. */
export function datosCliente(req: ConHeaders | null | undefined): { ip: string | null; userAgent: string | null } {
  if (!req) return { ip: null, userAgent: null }
  const xff = leerHeader(req, 'x-forwarded-for')
  return {
    ip: xff?.split(',')[0]?.trim() || leerHeader(req, 'x-real-ip'),
    userAgent: leerHeader(req, 'user-agent'),
  }
}

export function logActividad(datos: DatosActividad): void {
  try {
    prisma.logActividad.create({
      data: {
        tipo: datos.tipo,
        userId: datos.userId ?? null,
        ruta: datos.ruta?.slice(0, 300) ?? null,
        metodo: datos.metodo ?? null,
        estado: datos.estado ?? null,
        ipHash: hashIp(datos.ip),
        userAgent: datos.userAgent?.slice(0, 200) ?? null,
        detalle: datos.detalle,
      },
    }).catch(err => console.error('[Actividad] No se pudo registrar:', datos.tipo, err?.message))
  } catch (err: any) {
    console.error('[Actividad] No se pudo registrar:', datos.tipo, err?.message)
  }
}

// server.js envuelve cada petición en este AsyncLocalStorage. Si una ruta admin ya registró su acción
// con detalle (registrarAccionAdmin), se marca aquí para que el log genérico de server.js no la duplique.
function marcarAccionAdminRegistrada() {
  try {
    const store = (globalThis as any).__actividadCtx?.getStore?.()
    if (store) store.adminRegistrado = true
  } catch {}
}

/**
 * Sustituto de prisma.logAccionAdmin.create: mantiene la tabla LogAccionAdmin (mismo comportamiento,
 * incluido lanzar si falla) y además deja la acción en LogActividad como tipo ADMIN.
 */
export async function registrarAccionAdmin(args: { data: Prisma.LogAccionAdminUncheckedCreateInput }) {
  const log = await prisma.logAccionAdmin.create(args)
  marcarAccionAdminRegistrada()
  logActividad({
    tipo: 'ADMIN',
    userId: args.data.adminId,
    detalle: {
      accion: args.data.accion,
      targetUserId: args.data.targetUserId,
      ...(args.data.detalle ? { detalle: String(args.data.detalle).slice(0, 200) } : {}),
    },
  })
  return log
}
