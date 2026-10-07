import { fromZonedTime } from 'date-fns-tz'
import { prisma } from './prisma'
import { ZONA, etiquetaTemporada, getTemporadaActiva, mesYAnio, rankingEquiposMes } from './temporadas'

/** Todo lo que necesita la página /equipos/[id] (y GET /api/equipos/[id]). */
export async function getEquipoDetalle(id: string) {
  const equipo = await prisma.equipo.findUnique({
    where: { id },
    include: {
      lider: { select: { id: true, username: true, avatar: true } },
      miembros: {
        orderBy: [{ rol: 'asc' }, { fechaUnion: 'asc' }],
        include: { user: { select: { id: true, username: true, avatar: true, pais: true, totalPuntos: true } } },
      },
      puntosMes: { orderBy: [{ anio: 'asc' }, { mes: 'asc' }] },
    },
  })
  if (!equipo) return null

  const { mes, anio } = mesYAnio()
  const pad = (n: number) => String(n).padStart(2, '0')
  const inicioMes = fromZonedTime(`${anio}-${pad(mes)}-01T00:00:00`, ZONA)

  const [ranking, temporada, aportadoTotal, aportadoMes] = await Promise.all([
    rankingEquiposMes(mes, anio),
    getTemporadaActiva(),
    prisma.resultado.groupBy({ by: ['userId'], where: { equipoId: id }, _sum: { puntos: true } }),
    prisma.resultado.groupBy({
      by: ['userId'],
      where: { equipoId: id, carrera: { fecha: { gte: inicioMes } } },
      _sum: { puntos: true },
    }),
  ])

  const totalPorUser = new Map(aportadoTotal.map(a => [a.userId, a._sum.puntos ?? 0]))
  const mesPorUser = new Map(aportadoMes.map(a => [a.userId, a._sum.puntos ?? 0]))
  const enRanking = ranking.find(r => r.id === id)

  const propuesta = temporada
    ? await prisma.propuestaEquipo.findUnique({ where: { equipoId_temporadaId: { equipoId: id, temporadaId: temporada.id } } })
    : null

  return {
    ...equipo,
    miembros: equipo.miembros.map(m => ({
      ...m,
      puntosMes: mesPorUser.get(m.userId) ?? 0,
      puntosEquipo: totalPorUser.get(m.userId) ?? 0,
    })),
    puntosMesActual: enRanking?.puntosMes ?? 0,
    posicionMes: equipo.activo ? enRanking?.posicion ?? null : null,
    totalEquipos: ranking.length,
    temporada: temporada ? { id: temporada.id, numero: temporada.numero, anio: temporada.anio, etiqueta: etiquetaTemporada(temporada).texto } : null,
    propuesta,
  }
}
