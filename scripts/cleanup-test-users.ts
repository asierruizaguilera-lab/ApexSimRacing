import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Carga .env.local si no hay DATABASE_URL en el entorno (desarrollo local)
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8')
      .split('\n')
      .forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) return
        const eq = trimmed.indexOf('=')
        if (eq === -1) return
        const key = trimmed.slice(0, eq).trim()
        const val = trimmed.slice(eq + 1).trim()
        if (key && !(key in process.env)) process.env[key] = val
      })
  }
}

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando cuentas de prueba (@apex.gg excepto admin@apex.gg)...')

  const testUsers = await prisma.user.findMany({
    where: {
      email: { endsWith: '@apex.gg' },
      NOT: { email: 'admin@apex.gg' },
    },
    select: { id: true, email: true, username: true },
  })

  if (testUsers.length === 0) {
    console.log('✅ No se encontraron cuentas de prueba.')
    return
  }

  console.log(`\nCuentas encontradas (${testUsers.length}):`)
  testUsers.forEach(u => console.log(`  - ${u.username} <${u.email}>`))

  const userIds = testUsers.map(u => u.id)

  console.log('\n🗑  Eliminando datos relacionados...')

  const [coches, resultados, inscripciones, mensajes, notificaciones, logs, suscripciones, sessions, accounts] =
    await Promise.all([
      prisma.cocheDesbloqueado.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.resultado.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.inscripcion.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.mensajeChat.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.notificacion.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.logAccionAdmin.deleteMany({
        where: { OR: [{ adminId: { in: userIds } }, { targetUserId: { in: userIds } }] },
      }),
      prisma.suscripcion.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.session.deleteMany({ where: { userId: { in: userIds } } }),
      prisma.account.deleteMany({ where: { userId: { in: userIds } } }),
    ])

  const deletedUsers = await prisma.user.deleteMany({ where: { id: { in: userIds } } })

  console.log('\n📊 Resumen de eliminación:')
  console.log(`  Usuarios:           ${deletedUsers.count}`)
  console.log(`  Suscripciones:      ${suscripciones.count}`)
  console.log(`  Inscripciones:      ${inscripciones.count}`)
  console.log(`  Resultados:         ${resultados.count}`)
  console.log(`  Mensajes de chat:   ${mensajes.count}`)
  console.log(`  Notificaciones:     ${notificaciones.count}`)
  console.log(`  Logs admin:         ${logs.count}`)
  console.log(`  Coches desbloq.:    ${coches.count}`)
  console.log(`  Sessions:           ${sessions.count}`)
  console.log(`  Accounts OAuth:     ${accounts.count}`)
  console.log('\n✅ Limpieza completada.')
}

main()
  .catch(err => {
    console.error('❌ Error durante la limpieza:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
