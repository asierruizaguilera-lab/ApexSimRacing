import type { Prisma, TipoActividad } from '@prisma/client'
import { prisma } from './prisma'

export const TIPOS_ACTIVIDAD: TipoActividad[] = [
  'LOGIN_OK', 'LOGIN_FALLIDO', 'LOGOUT', 'REGISTRO', 'VISTA',
  'PAGO', 'CAMBIO_PLAN', 'ADMIN', 'SEGURIDAD', 'ERROR_API',
]

/** Filtros de /admin/actividad (tipo, usuario por nombre/email, rango de fechas) → where de Prisma. */
export async function whereActividad(params: URLSearchParams): Promise<Prisma.LogActividadWhereInput> {
  const where: Prisma.LogActividadWhereInput = {}

  const tipo = params.get('tipo')
  if (tipo && (TIPOS_ACTIVIDAD as string[]).includes(tipo)) where.tipo = tipo as TipoActividad

  const usuario = params.get('usuario')?.trim()
  if (usuario) {
    const users = await prisma.user.findMany({
      where: { OR: [{ username: { contains: usuario, mode: 'insensitive' } }, { email: { contains: usuario, mode: 'insensitive' } }] },
      select: { id: true },
      take: 50,
    })
    // Permite también pegar un userId exacto (p. ej. el targetUserId de un detalle)
    where.userId = { in: [...users.map(u => u.id), usuario] }
  }

  const desde = params.get('desde')
  const hasta = params.get('hasta')
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
