// Plan B de recuperación del admin. Lo lanza server.js al arrancar SOLO si RUN_RESET_ADMIN=true.
// Lee la nueva contraseña de ADMIN_NEW_PASSWORD (mínimo 10 caracteres, como PASSWORD_MIN) y NUNCA la escribe
// en ningún log. Después de usarlo: quitar RUN_RESET_ADMIN y ADMIN_NEW_PASSWORD del entorno de Render.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = 'admin@apex.gg'
const MIN_CARACTERES = 10
// Mismo bcryptjs y coste que registro y restablecer (src/app/api/auth/*)
const COSTE_BCRYPT = 12

async function main() {
  if (process.env.RUN_RESET_ADMIN !== 'true') return
  const nueva = process.env.ADMIN_NEW_PASSWORD ?? ''
  if (nueva.length < MIN_CARACTERES) {
    console.error(`[BOOT] ❌ reset-admin-password: ADMIN_NEW_PASSWORD falta o tiene menos de ${MIN_CARACTERES} caracteres; no se cambia nada`)
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  try {
    const admin = await prisma.user.findFirst({
      where: { email: { equals: ADMIN_EMAIL, mode: 'insensitive' } },
      select: { id: true },
    })
    if (!admin) {
      console.error('[BOOT] ❌ reset-admin-password: no existe la cuenta del admin; no se cambia nada')
      process.exitCode = 1
      return
    }

    await prisma.user.update({
      where: { id: admin.id },
      // passwordCambiadoEn invalida las sesiones abiertas anteriores (server.js, comprobarSesion)
      data: { password: await bcrypt.hash(nueva, COSTE_BCRYPT), passwordCambiadoEn: new Date() },
    })

    await prisma.logActividad.create({
      data: { tipo: 'SEGURIDAD', userId: admin.id, ruta: 'boot:reset-admin-password', detalle: { motivo: 'reset_admin_password' } },
    })

    // El bloqueo por intentos de login vive en memoria del proceso del servidor (src/lib/rateLimit.ts):
    // este script corre durante el arranque, antes de que el servidor escuche, así que ese mapa empieza vacío.
    console.log('[BOOT] ✅ reset-admin-password: contraseña del admin actualizada, sesiones anteriores invalidadas y bloqueo de login limpio (reinicio)')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(err => {
  // Solo el nombre/código: un error de Prisma puede incluir datos de la conexión
  console.error('[BOOT] ❌ reset-admin-password falló:', err?.code ?? err?.name ?? 'desconocido')
  process.exitCode = 1
})
