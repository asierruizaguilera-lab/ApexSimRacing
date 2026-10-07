/**
 * Migración del enum CanalChat: elimina el canal #drift del chat de comunidad.
 * Ejecutar con: npm run migrate:canal-drift
 * O en el arranque con RUN_SEED_ON_START=true (ver server.js), antes de `prisma db push`.
 *
 * Borra los mensajes del canal DRIFT y recrea el tipo "CanalChat" sin ese valor (Postgres no
 * permite quitar valores de un enum). Así `db push` no encuentra diferencias y no necesita
 * --accept-data-loss. Es idempotente: si el valor DRIFT ya no existe, no hace nada.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Migración canal de chat DRIFT → eliminado\n')

  const valor = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `SELECT count(*) AS n FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'CanalChat' AND e.enumlabel = 'DRIFT'`
  )
  if (Number(valor[0].n) === 0) {
    console.log('✅ El canal DRIFT ya no existe en el enum CanalChat. Nada que hacer.')
    return
  }

  await prisma.$transaction(async (tx) => {
    const borrados = await tx.$executeRawUnsafe(`DELETE FROM "mensajes_chat" WHERE canal::text = 'DRIFT'`)
    console.log(`🗑️  Mensajes del canal DRIFT eliminados: ${borrados}`)

    await tx.$executeRawUnsafe(`ALTER TYPE "CanalChat" RENAME TO "CanalChat_old"`)
    await tx.$executeRawUnsafe(`CREATE TYPE "CanalChat" AS ENUM ('GENERAL', 'RALLY', 'CIRCUITO', 'ANUNCIOS')`)
    await tx.$executeRawUnsafe(`ALTER TABLE "mensajes_chat" ALTER COLUMN canal DROP DEFAULT`)
    await tx.$executeRawUnsafe(
      `ALTER TABLE "mensajes_chat" ALTER COLUMN canal TYPE "CanalChat" USING canal::text::"CanalChat"`
    )
    await tx.$executeRawUnsafe(`ALTER TABLE "mensajes_chat" ALTER COLUMN canal SET DEFAULT 'GENERAL'`)
    await tx.$executeRawUnsafe(`DROP TYPE "CanalChat_old"`)
  })

  console.log('✅ Enum CanalChat recreado sin DRIFT.')
}

main()
  .catch((err) => {
    console.error('❌ Error en la migración:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
