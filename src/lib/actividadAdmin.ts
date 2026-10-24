import { TipoActividad as TipoActividadEnum } from '@prisma/client'
import type { Prisma, TipoActividad } from '@prisma/client'
import { z } from './validacion'
import { prisma } from './prisma'

export const TIPOS_ACTIVIDAD: TipoActividad[] = [
  'LOGIN_OK', 'LOGIN_FALLIDO', 'LOGOUT', 'REGISTRO', 'VISTA',
  'PAGO', 'CAMBIO_PLAN', 'ADMIN', 'SEGURIDAD', 'ERROR_API',
]

const Filtros = z.object({
  tipo: z.nativeEnum(TipoActividadEnum).optional().catch(undefined),
  usuario: z.string().max(100).optional().catch(undefined),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
})

/** Filtros de /admin/actividad (tipo, usuario por nombre/email, rango de fechas) → where de Prisma. */
export async function whereActividad(params: URLSearchParams): Promise<Prisma.LogActividadWhereInput> {
  const where: Prisma.LogActividadWhereInput = {}
  // .catch(undefined): un filtro mal formado se ignora en vez de romper la página
  const f = Filtros.parse(Object.fromEntries(params))

  if (f.tipo) where.tipo = f.tipo

  const usuario = f.usuario?.trim()
  if (usuario) {
    const users = await prisma.user.findMany({
      where: { OR: [{ username: { contains: usuario, mode: 'insensitive' } }, { email: { contains: usuario, mode: 'insensitive' } }] },
      select: { id: true },
      take: 50,
    })
    // Permite también pegar un userId exacto (p. ej. el targetUserId de un detalle)
    where.userId = { in: [...users.map(u => u.id), usuario] }
  }

  const { desde, hasta } = f
  const creadoEn: Prisma.DateTimeFilter = {}
  if (desde && !isNaN(Date.parse(desde))) creadoEn.gte = new Date(`${desde}T00:00:00`)
  if (hasta && !isNaN(Date.parse(hasta))) creadoEn.lte = new Date(`${hasta}T23:59:59.999`)
  if (creadoEn.gte || creadoEn.lte) where.creadoEn = creadoEn

  return where
}

/** username de cada userId que aparece en los logs (los borrados quedan sin nombre). */
export async function nombresUsuarios(userIds: (string | null)[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => !!id)))
  if (ids.length === 0) return new Map()
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true } })
  return new Map(users.map(u => [u.id, u.username]))
}

export async function kpisActividad24h() {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [activos, loginsFallidos, errores] = await Promise.all([
    prisma.logActividad.groupBy({ by: ['userId'], where: { creadoEn: { gte: desde }, userId: { not: null } } }),
    prisma.logActividad.count({ where: { tipo: 'LOGIN_FALLIDO', creadoEn: { gte: desde } } }),
    prisma.logActividad.count({ where: { tipo: 'ERROR_API', creadoEn: { gte: desde } } }),
  ])
  return { activos: activos.length, loginsFallidos, errores }
}
