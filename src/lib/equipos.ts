import { prisma } from './prisma'
import { esAccesoActivo } from './suscripciones'
import { mesYAnio } from './temporadas'

export { MAX_MIEMBROS_EQUIPO } from './utils'
export const COLOR_EQUIPO_DEFECTO = '#C0392B'
export const MAX_LONGITUD_MENSAJE = 500

export const USER_MINI_SELECT = { id: true, username: true, avatar: true, role: true } as const

export function colorValido(c: unknown): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
}

/** URLs que se renderizan en src/href: solo http(s) o rutas locales. */
export function urlOpcional(v: unknown): { ok: boolean; valor: string | null } {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return { ok: true, valor: null }
  if (typeof v !== 'string') return { ok: false, valor: null }
  const t = v.trim()
  return { ok: /^https?:\/\//i.test(t) || t.startsWith('/'), valor: t }
}

export async function esEliteActivo(userId: string): Promise<boolean> {
  const s = await prisma.suscripcion.findUnique({
    where: { userId },
    select: { plan: true, estado: true, fechaExpiracionManual: true },
  })
  return !!s && s.plan === 'ELITE' && esAccesoActivo(s)
}

/** Membresía del usuario (con su equipo) o null. */
export async function getMembresia(userId: string) {
  return prisma.miembroEquipo.findUnique({
    where: { userId },
    include: { equipo: { select: { id: true, nombre: true, colorPrimario: true, logoUrl: true, liderId: true, activo: true } } },
  })
}

/** Canal Socket.io de una conversación privada: siempre con los ids ordenados. */
export function canalDM(a: string, b: string): string {
  return `dm:${[a, b].sort().join('-')}`
}

export function emitir(room: string, evento: string, payload: unknown) {
  const io = (global as any).io
  if (io) io.to(room).emit(evento, payload)
}

/**
 * Disuelve un equipo: libera a sus miembros, cancela invitaciones e inscripciones pendientes y lo
 * marca inactivo. No se borra para conservar su histórico de puntos y temporadas ganadas; el nombre
 * se libera (se le añade un sufijo) para que otro equipo pueda usarlo.
 */
export async function disolverEquipo(equipoId: string) {
  const equipo = await prisma.equipo.findUniqueOrThrow({
    where: { id: equipoId },
    include: { miembros: { select: { userId: true } } },
  })
  await prisma.$transaction([
    prisma.miembroEquipo.deleteMany({ where: { equipoId } }),
    prisma.invitacionEquipo.updateMany({ where: { equipoId, estado: 'PENDIENTE' }, data: { estado: 'RECHAZADA' } }),
    prisma.inscripcionEquipo.updateMany({ where: { equipoId, estado: { not: 'CANCELADA' } }, data: { estado: 'CANCELADA' } }),
    prisma.equipo.update({
      where: { id: equipoId },
      data: { activo: false, nombre: `${equipo.nombre} (disuelto ${equipoId.slice(-4)})` },
    }),
  ])
  if (equipo.miembros.length > 0) {
    await prisma.notificacion.createMany({
      data: equipo.miembros.map(m => ({
        userId: m.userId, tipo: 'EQUIPO' as const, mensaje: `El equipo ${equipo.nombre} se ha disuelto`, link: '/equipos',
      })),
    })
  }
  emitir(`equipo:${equipoId}`, 'equipo:disuelto', { id: equipoId })
}

/** Equipos (activos y disueltos) para el panel admin, con miembros y puntos del mes. */
export async function listarEquiposAdmin() {
  const { mes, anio } = mesYAnio()
  const equipos = await prisma.equipo.findMany({
    orderBy: [{ activo: 'desc' }, { creadoEn: 'desc' }],
    include: {
      lider: { select: { id: true, username: true } },
      miembros: { include: { user: { select: { id: true, username: true, avatar: true } } }, orderBy: { fechaUnion: 'asc' } },
      puntosMes: { where: { mes, anio }, select: { puntos: true } },
      _count: { select: { mensajes: true } },
    },
  })
  return equipos.map(e => ({
    id: e.id,
    nombre: e.nombre,
    colorPrimario: e.colorPrimario,
    logoUrl: e.logoUrl,
    activo: e.activo,
    creadoEn: e.creadoEn.toISOString(),
    lider: e.lider,
    miembros: e.miembros.map(m => ({ userId: m.userId, rol: m.rol, user: m.user })),
    puntosMes: e.puntosMes[0]?.puntos ?? 0,
    totalMensajes: e._count.mensajes,
  }))
}
