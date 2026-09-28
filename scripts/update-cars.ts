/**
 * Actualiza el catálogo de coches del Garaje APEX.
 * Ejecutar con: npm run update:cars
 *
 * - Elimina Nissan S13 y Nissan R35 GT-R Drift (y sus desbloqueos)
 * - Renombra BMW E30 → BMW E36 320i BTCC, Porsche 911 GT3 → Porsche 992 GT3, Dallara F3 → Tatuus F3
 * - Sobrescribe link de descarga, descripción e imagen de todos los coches del catálogo
 * - Desbloquea a cada suscriptor activo los coches de su plan que le falten
 *
 * NO borra usuarios, suscripciones ni ningún otro dato.
 */
import { PrismaClient } from '@prisma/client'
import { sincronizarCoches, COCHES_CATALOGO } from '../prisma/coches-catalogo'

const prisma = new PrismaClient()

async function main() {
  console.log('🚗 Actualizando catálogo del Garaje APEX\n')
  console.log('─'.repeat(60))

  const r = await sincronizarCoches(prisma, { force: true })

  const bloque = (titulo: string, items: string[]) => {
    console.log(`\n${titulo} (${items.length})`)
    if (items.length === 0) console.log('   —')
    for (const i of items) console.log(`   • ${i}`)
  }

  bloque('🗑️  Eliminados', r.eliminados)
  bloque('✏️  Renombrados', r.renombrados)
  bloque('➕ Creados', r.creados)
  bloque('🔄 Actualizados (link, descripción, imagen)', r.actualizados)

  const conLink = COCHES_CATALOGO.filter(c => c.linkDescarga).length
  console.log(`\n🔓 Desbloqueos nuevos para suscriptores activos: ${r.desbloqueosNuevos}`)
  console.log(`📦 Catálogo: ${COCHES_CATALOGO.length} coches — ${conLink} con link de descarga, ${COCHES_CATALOGO.length - conLink} "Próximamente"`)
  console.log('\n' + '─'.repeat(60))
  console.log('✅ Catálogo actualizado')
}

main()
  .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
