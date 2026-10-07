import { prisma } from './prisma'

// Stats del ranking individual: solo cuentan campeonatos individuales.
// Los resultados de campeonatos de equipos suman únicamente a la clasificación del equipo.
export const RESULTADO_INDIVIDUAL = { carrera: { campeonato: { esCampeonatoEquipos: false } } } as const

/** Puntos restados al piloto por sanciones PENALIZACION_PUNTOS de incidencias. */
export async function puntosPenalizados(userId: string): Promise<number> {
  const { _sum } = await prisma.queja.aggregate({
    where: { denunciadoId: userId, sancion: 'PENALIZACION_PUNTOS' },
    _sum: { puntosPenalizados: true },
  })
  return _sum.puntosPenalizados ?? 0
}

/**
 * Recalcula las stats individuales desde cero: suma los resultados de campeonatos individuales y resta
 * las penalizaciones de puntos de las incidencias (sin bajar de 0). Es la única fuente de verdad de
 * totalPuntos, así que recalcular nunca borra una sanción.
 */
export async function recalcularStatsPiloto(userId: string) {
  const [resultados, penalizacion] = await Promise.all([
    prisma.resultado.findMany({
      where: { userId, ...RESULTADO_INDIVIDUAL },
      select: { puntos: true, posicion: true, abandono: true },
    }),
    puntosPenalizados(userId),
  ])
  const puntosCarrera = resultados.reduce((s, r) => s + r.puntos, 0)
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalPuntos: Math.max(0, puntosCarrera - penalizacion),
      totalCarreras: resultados.filter(r => !r.abandono).length,
      totalVictorias: resultados.filter(r => r.posicion === 1).length,
      totalPodios: resultados.filter(r => r.posicion <= 3).length,
    },
  })
}
