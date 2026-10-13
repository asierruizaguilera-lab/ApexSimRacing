/**
 * Limpieza de la Academia: borra las clases antiguas (las que no tienen numeroModulo, es decir,
 * todo lo que no es uno de los módulos de formación) y el colaborador Vadosan.
 * Ejecutar con: npm run cleanup:academia
 * O en el arranque con RUN_CLEANUP_ACADEMIA=true (ver server.js), después de `db push` y del seed.
 *
 * Las vistas de las clases borradas se eliminan en cascada (ClaseVista onDelete: Cascade).
 * Es idempotente: si ya no queda nada que borrar, no hace nada.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Limpieza de la Academia\n')

  const antiguas = await prisma.clase.findMany({
    where: { numeroModulo: null },
    select: { id: true, titulo: true },
  })
  for (const c of antiguas) console.log(`   🗑️  Clase: ${c.titulo}`)
  const clases = await prisma.clase.deleteMany({ where: { id: { in: antiguas.map(c => c.id) } } })
  console.log(`✅ Clases antiguas eliminadas: ${clases.count}`)

  const vadosan = await prisma.patrocinador.deleteMany({
    where: { nombre: { contains: 'vadosan', mode: 'insensitive' } },
  })
  console.log(`✅ Patrocinadores Vadosan eliminados: ${vadosan.count}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
