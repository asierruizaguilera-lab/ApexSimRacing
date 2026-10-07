import { prisma } from './prisma'

// Stats del ranking individual: solo cuentan campeonatos individuales.
// Los resultados de campeonatos de equipos suman únicamente a la clasificación del equipo.
export const RESULTADO_INDIVIDUAL = { carrera: { campeonato: { esCampeonatoEquipos: false } } } as const

export async function recalcularStatsPiloto(userId: string) {
  const resultados = await prisma.resultado.findMany({
    where: { userId, ...RESULTADO_INDIVIDUAL },
    select: { puntos: true, posicion: true, abandono: true },
  })
  await prisma.user.update({
    where: { id: userId },
    data: {
      totalPuntos: resultados.reduce((s, r) => s + r.puntos, 0),
      totalCarreras: resultados.filter(r => !r.abandono).length,
      totalVictorias: resultados.filter(r => r.posicion === 1).length,
      totalPodios: resultados.filter(r => r.posicion <= 3).length,
    },
  })
}
