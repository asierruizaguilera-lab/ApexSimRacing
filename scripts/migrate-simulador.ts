/**
 * Migración del enum Simulador: pasa a ASSETTO_CORSA todos los campeonatos con otro simulador.
 * Ejecutar con: npm run migrate:simulador
 * O en el arranque con la variable de entorno RUN_MIGRATION_SIMULADOR=true (ver server.js).
 *
 * El campo `simulador` ya no existe en schema.prisma (APEX solo usa Assetto Corsa), así que
 * se trabaja con SQL directo. Es idempotente: si la columna ya no existe o todo está en
 * ASSETTO_CORSA, no hace nada.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Migración simulador → ASSETTO_CORSA\n')

  const columna = await prisma.$queryRawUnsafe<{ udt_name: string }[]>(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = 'campeonatos' AND column_name = 'simulador'`
  )
  if (columna.length === 0) {
    console.log('✅ La columna campeonatos.simulador no existe (ya migrada/eliminada). Nada que hacer.')
    return
  }

  // Si la columna es un enum, garantizar que el valor ASSETTO_CORSA existe
  const tipo = columna[0].udt_name
  const esEnum = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_type WHERE typname = $1 AND typtype = 'e'`, tipo
  )
  if (Number(esEnum[0].n) > 0) {
    await prisma.$executeRawUnsafe(`ALTER TYPE "${tipo}" ADD VALUE IF NOT EXISTS 'ASSETTO_CORSA'`)
  }

  const pendientes = await prisma.$queryRawUnsafe<{ id: string; nombre: string; simulador: string | null }[]>(
    `SELECT id, nombre, simulador::text AS simulador FROM "campeonatos"
     WHERE simulador IS NULL OR simulador::text <> 'ASSETTO_CORSA'`
  )
  if (pendientes.length === 0) {
    console.log('✅ Todos los campeonatos ya usan ASSETTO_CORSA. Nada que hacer.')
    return
  }

  console.log(`⚠️  ${pendientes.length} campeonato(s) con otro simulador:`)
  for (const c of pendientes) console.log(`   - ${c.nombre} (${c.simulador ?? 'NULL'})`)

  const actualizados = await prisma.$executeRawUnsafe(
    `UPDATE "campeonatos" SET simulador = 'ASSETTO_CORSA'
     WHERE simulador IS NULL OR simulador::text <> 'ASSETTO_CORSA'`
  )
  console.log(`\n✅ ${actualizados} campeonato(s) actualizados a ASSETTO_CORSA.`)
}

main()
  .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
