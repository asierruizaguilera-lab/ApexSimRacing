import { prisma } from './prisma'
import { getTemporadaGratuitaActiva } from './config'
import { esAccesoActivo, temporadaGratuitaForzada, tieneAcceso } from './acceso'

/** No se pudo leer el flag de temporada gratuita: nunca se trata como "apagado" en silencio. */
export class ErrorLecturaFlag extends Error {
  constructor() {
    super('No se pudo leer el modo temporada gratuita')
    this.name = 'ErrorLecturaFlag'
  }
}

/** Solo nombre/código del error: un error de Prisma puede incluir datos de la conexión. */
export function describirError(e: unknown): string {
  const err = e as { code?: string; name?: string } | null
  return err?.code ?? err?.name ?? 'desconocido'
}

/** Lee el flag de la BD. Si falla, lo registra como SEGURIDAD y lanza ErrorLecturaFlag. */
export async function leerTemporadaGratuita(origen: string): Promise<boolean> {
  // Forzada por entorno: no depende de la BD (ni de que su lectura funcione)
  if (temporadaGratuitaForzada()) return true
  try {
    return await getTemporadaGratuitaActiva()
  } catch (e) {
    console.error(`[SEGURIDAD] Fallo al leer temporadaGratuitaActiva (${origen}): ${describirError(e)}`)
    throw new ErrorLecturaFlag()
  }
}

export type AccesoUsuario = {
  acceso: boolean
  temporadaGratuita: boolean
  suscripcionActiva: boolean
  esAdmin: boolean
  baneado: boolean
  plan: string | null
}

/** Estado de acceso leído de la BD (no del JWT). Lanza ErrorLecturaFlag si falla la lectura del flag. */
export async function getAccesoUsuario(userId: string, origen: string): Promise<AccesoUsuario> {
  const [user, temporadaGratuita] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        baneado: true,
        suscripcion: { select: { estado: true, fechaExpiracionManual: true, plan: true } },
      },
    }),
    leerTemporadaGratuita(origen),
  ])
  const suscripcionActiva = esAccesoActivo(user?.suscripcion)
  const baneado = !!user?.baneado
  const esAdmin = user?.role === 'ADMIN'
  return {
    acceso: !!user && tieneAcceso({ role: user.role, baneado, suscripcionActiva, temporadaGratuita }),
    temporadaGratuita,
    suscripcionActiva,
    esAdmin,
    baneado,
    plan: suscripcionActiva ? user!.suscripcion!.plan : null,
  }
}

/**
 * Misma decisión que el middleware (rol y suscripción del JWT + flag fresco de la BD). Para redirecciones
 * de página: usar la BD para la suscripción y el JWT en el middleware podría crear un bucle / ↔ /dashboard.
 */
export async function getAccesoSesion(
  user: { role?: string | null; baneado?: boolean | null; hasSuscripcion?: boolean | null },
  origen: string,
): Promise<{ acceso: boolean; temporadaGratuita: boolean }> {
  const temporadaGratuita = await leerTemporadaGratuita(origen)
  return {
    acceso: tieneAcceso({ role: user.role, baneado: user.baneado, suscripcionActiva: !!user.hasSuscripcion, temporadaGratuita }),
    temporadaGratuita,
  }
}
