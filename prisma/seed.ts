import { PrismaClient, Rol, PlanSuscripcion } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { fromZonedTime } from 'date-fns-tz'
import { sincronizarCoches } from './coches-catalogo'

const prisma = new PrismaClient()

// Seed mínimo y no destructivo: solo crea lo imprescindible para que la app funcione en una BD vacía
// (admin, catálogo de coches y temporadas del año). Nunca borra usuarios ni datos existentes y no
// crea datos de prueba. Se ejecuta con ts-node --transpile-only para no cargar los tipos de Prisma
// en memoria (ver server.js).
async function main() {
  console.log('🌱 Iniciando seed de APEX...')

  // ── 1. Admin — solo si la BD está vacía ──────────────────────────
  const totalUsuarios = await prisma.user.count()
  if (totalUsuarios === 0) {
    const adminPassword = await bcrypt.hash('admin123', 12)
    const admin = await prisma.user.create({
      data: {
        username: 'APEX_Admin',
        email: 'admin@apex.gg',
        password: adminPassword,
        role: Rol.ADMIN,
        pais: 'ES',
        bio: 'Administrador de la plataforma APEX SimRacing.',
        totalPuntos: 0,
      },
    })

    const fechaRenovacion = new Date()
    fechaRenovacion.setFullYear(fechaRenovacion.getFullYear() + 10)

    await prisma.suscripcion.create({
      data: {
        userId: admin.id,
        plan: PlanSuscripcion.ELITE,
        estado: 'GRATUITA',
        precioMensual: 0,
        fechaRenovacion,
        esGratuita: true,
        notasAdmin: 'Admin — acceso permanente Elite',
      },
    })

    console.log('   ✅ Admin + suscripción Elite creados')
  } else {
    console.log(`   ⏭️  BD con ${totalUsuarios} usuarios — omitiendo creación de admin`)
  }

  // ── 2. Catálogo de coches — sincronización no destructiva (nunca toca usuarios) ──
  const resumenCoches = await sincronizarCoches(prisma, { force: false })
  console.log(
    `   🚗 Coches: ${resumenCoches.creados.length} creados, ${resumenCoches.renombrados.length} renombrados, ` +
    `${resumenCoches.actualizados.length} actualizados, ${resumenCoches.eliminados.length} eliminados, ` +
    `${resumenCoches.desbloqueosNuevos} desbloqueos nuevos`
  )

  // ── 3. Temporadas del año en curso — solo crea las que falten, nunca activa ni borra nada ──
  // (la liga la arranca el admin desde /admin/temporadas, que es quien asigna el coche de equipo)
  const zona = 'Europe/Madrid'
  const anio = Number(new Intl.DateTimeFormat('en', { timeZone: zona, year: 'numeric' }).format(new Date()))
  let temporadasCreadas = 0
  for (const numero of [1, 2, 3]) {
    const existe = await prisma.temporada.findUnique({ where: { numero_anio: { numero, anio } } })
    if (existe) continue
    const mesInicio = (numero - 1) * 4 + 1
    const pad = (n: number) => String(n).padStart(2, '0')
    const fechaInicio = fromZonedTime(`${anio}-${pad(mesInicio)}-01T00:00:00`, zona)
    const siguiente = numero === 3 ? `${anio + 1}-01-01T00:00:00` : `${anio}-${pad(mesInicio + 4)}-01T00:00:00`
    const fechaFin = new Date(fromZonedTime(siguiente, zona).getTime() - 1)
    await prisma.temporada.create({ data: { numero, anio, fechaInicio, fechaFin } })
    temporadasCreadas++
  }
  console.log(temporadasCreadas > 0
    ? `   ✅ ${temporadasCreadas} temporadas de ${anio} creadas (inactivas)`
    : `   ⏭️  Temporadas de ${anio} ya existen — omitiendo`)

  console.log('✅ Seed completado')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
