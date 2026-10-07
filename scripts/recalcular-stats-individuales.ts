/**
 * Recalcula totalPuntos/totalCarreras/totalVictorias/totalPodios de los pilotos afectados por:
 *  - resultados en campeonatos de equipos (que ya no cuentan en el ranking individual)
 *  - sanciones PENALIZACION_PUNTOS (que un recálculo anterior pudo haber borrado)
 * Ejecutar con: npm run recalc:stats
 *
 * Solo actualiza estadísticas de usuario. NO borra resultados, sanciones, usuarios ni ningún otro dato.
 */
import { prisma } from '../src/lib/prisma'
import { recalcularStatsPiloto } from '../src/lib/statsPiloto'

async function main() {
  const [conEquipos, penalizados] = await Promise.all([
    prisma.resultado.findMany({
      where: { carrera: { campeonato: { esCampeonatoEquipos: true } } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.queja.findMany({
      where: { sancion: 'PENALIZACION_PUNTOS', denunciadoId: { not: null } },
      distinct: ['denunciadoId'],
      select: { denunciadoId: true },
    }),
  ])
  const ids = Array.from(new Set([...conEquipos.map(r => r.userId), ...penalizados.map(q => q.denunciadoId!)]))
  console.log(`🔄 ${ids.length} pilotos a recalcular (${conEquipos.length} con resultados de equipos, ${penalizados.length} con penalizaciones)\n`)

  for (const id of ids) {
    const antes = await prisma.user.findUnique({ where: { id }, select: { username: true, totalPuntos: true } })
    if (!antes) continue
    await recalcularStatsPiloto(id)
    const despues = await prisma.user.findUnique({ where: { id }, select: { totalPuntos: true } })
    console.log(`   • ${antes.username}: ${antes.totalPuntos} → ${despues?.totalPuntos} pts`)
  }
  console.log('\n✅ Stats individuales recalculadas')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
