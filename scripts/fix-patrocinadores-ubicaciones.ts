/**
 * Diagnóstico y corrección de ubicaciones de patrocinadores.
 * Ejecutar con: npx ts-node --compiler-options {"module":"CommonJS"} scripts/fix-patrocinadores-ubicaciones.ts
 * O con: npm run fix:patrocinadores
 *
 * Los patrocinadores con esColaborador=true (ej: Vadosan) NO se modifican.
 */
import { PrismaClient, UbicacionPatrocinador } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Diagnóstico de patrocinadores\n')
  console.log('─'.repeat(60))

  const all = await prisma.patrocinador.findMany({
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
  })

  console.log(`Total: ${all.length} patrocinador${all.length !== 1 ? 'es' : ''}\n`)

  for (const p of all) {
    const estado = p.activo ? '✅ ACTIVO  ' : '❌ INACTIVO'
    const tipo = p.esColaborador ? '[COLABORADOR]' : '[PATROCINADOR]'
    console.log(`${estado} ${tipo} ${p.nombre}`)
    console.log(`  ubicaciones: [${p.ubicaciones.length > 0 ? p.ubicaciones.join(', ') : 'NINGUNA'}]`)
    console.log(`  id: ${p.id}`)
    console.log()
  }

  console.log('─'.repeat(60))

  // Solo se actualizan patrocinadores normales (no colaboradores) sin TODAS
  const aActualizar = all.filter(
    p => !p.esColaborador && !p.ubicaciones.includes(UbicacionPatrocinador.TODAS)
  )

  if (aActualizar.length === 0) {
    console.log('\n✅ Todos los patrocinadores ya tienen ubicación TODAS. No se requieren cambios.')
    return
  }

  console.log(`\n⚠️  ${aActualizar.length} patrocinador${aActualizar.length !== 1 ? 'es' : ''} sin ubicación TODAS:`)
  for (const p of aActualizar) {
    console.log(`   - ${p.nombre} → ubicaciones actuales: [${p.ubicaciones.join(', ')}]`)
  }

  console.log('\n🔧 Actualizando a ubicación TODAS...\n')

  let actualizados = 0
  for (const p of aActualizar) {
    await prisma.patrocinador.update({
      where: { id: p.id },
      data: {
        ubicaciones: [UbicacionPatrocinador.TODAS],
        activo: true,
      },
    })
    console.log(`  ✅ ${p.nombre} → ubicaciones: [TODAS], activo: true`)
    actualizados++
  }

  console.log(`\n✅ ${actualizados} patrocinador${actualizados !== 1 ? 'es' : ''} actualizados correctamente.`)
  console.log('Los patrocinadores ahora aparecerán en landing, campeonatos, sidebar y todas las ubicaciones.')
}

main()
  .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
