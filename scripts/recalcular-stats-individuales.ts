/**
 * Recalcula totalPuntos/totalCarreras/totalVictorias/totalPodios de los pilotos que tienen resultados
 * en campeonatos de equipos, para que esos puntos dejen de contar en el ranking individual.
 * Ejecutar con: npm run recalc:stats
 *
 * Solo actualiza estadísticas de usuario. NO borra resultados, usuarios ni ningún otro dato.
 */
import { prisma } from '../src/lib/prisma'
import { recalcularStatsPiloto } from '../src/lib/statsPiloto'

async function main() {
  const afectados = await prisma.resultado.findMany({
    where: { carrera: { campeonato: { esCampeonatoEquipos: true } } },
    distinct: ['userId'],
    select: { userId: true, user: { select: { username: true, totalPuntos: true } } },
  })
  console.log(`🔄 ${afectados.length} pilotos con resultados en campeonatos de equipos\n`)

  for (const a of afectados) {
    await recalcularStatsPiloto(a.userId)
    const ahora = await prisma.user.findUnique({ where: { id: a.userId }, select: { totalPuntos: true } })
    console.log(`   • ${a.user.username}: ${a.user.totalPuntos} → ${ahora?.totalPuntos} pts`)
  }
  console.log('\n✅ Stats individuales recalculadas')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
