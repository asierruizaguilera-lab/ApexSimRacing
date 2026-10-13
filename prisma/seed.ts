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

  // ── 4. Módulos de la Academia — upsert por numeroModulo, nunca borra clases ──
  // Al actualizar no se tocan youtubeUrl ni publicada: el vídeo lo añade el admin cuando se graba.
  const modulos = [
    { numeroModulo: '0', titulo: 'BIENVENIDA', descripcion: 'Cómo funciona la academia, en qué orden aprender y qué necesitas antes de rodar.', numeroTecnicas: 6, duracionTexto: '≈ 6 MIN + 30 MIN DE PREPARACIÓN' },
    { numeroModulo: '1.1', titulo: 'TÉCNICAS BASE DE VOLANTE', descripcion: 'Cómo sujetar el volante, cómo se reparte el agarre y cómo corregir cuando el coche no hace lo que pides.', numeroTecnicas: 4, duracionTexto: '≈ 8 MIN + PRÁCTICA' },
    { numeroModulo: '1.2', titulo: 'TÉCNICAS DE PIES', descripcion: 'Acelerador, freno y embrague: cómo mueven el peso del coche, cuándo cambiar y cómo reducir sin descolocarlo.', numeroTecnicas: 5, duracionTexto: '≈ 10 MIN + PRÁCTICA' },
    { numeroModulo: '1.3', titulo: 'TÉCNICAS DE VISIÓN Y POSICIÓN', descripcion: 'Dónde te sientas, hacia dónde miras y dónde colocas el coche en la pista.', numeroTecnicas: 6, duracionTexto: '≈ 12 MIN + PRÁCTICA' },
    { numeroModulo: '2', titulo: 'FRENADA', descripcion: 'Donde más tiempo se gana y se pierde: de configurar el pedal a girar el coche con el freno.', numeroTecnicas: 9, duracionTexto: '≈ 12 MIN + PRÁCTICA' },
    { numeroModulo: '3', titulo: 'TRAZADA', descripcion: 'La trazada ideal no es la más rápida en la curva: es la que te hace llegar antes al final de la recta.', numeroTecnicas: 10, duracionTexto: null },
    { numeroModulo: '4', titulo: 'CÓMO FUNCIONA ASSETTO CORSA', descripcion: 'En AC casi todo depende de que el neumático trabaje en su ventana de presión y temperatura.', numeroTecnicas: 9, duracionTexto: '≈ 11 MIN + PRÁCTICA' },
    { numeroModulo: '5', titulo: 'SETUPS', descripcion: 'El setup hace que el coche obedezca en cada fase de la curva. No sustituye a la técnica: la completa.', numeroTecnicas: 11, duracionTexto: null },
    { numeroModulo: '6', titulo: 'TÉCNICAS DE CARRERA', descripcion: 'La carrera no la gana la vuelta más rápida, sino quien termina más arriba sin errores.', numeroTecnicas: 10, duracionTexto: null },
    { numeroModulo: '7', titulo: 'GESTIÓN MENTAL', descripcion: 'Se pierde más tiempo por la cabeza que por la técnica. La mente se entrena igual que una frenada.', numeroTecnicas: 8, duracionTexto: '≈ 8 MIN + PRÁCTICA' },
    { numeroModulo: '8', titulo: 'PLAN Y PRIMER CAMPEONATO', descripcion: 'Cuatro semanas para pasar de «dar vueltas» a competir limpio, y cómo aplicarlo a la temporada de iniciación con el Honda Civic.', numeroTecnicas: 5, duracionTexto: '≈ 7 MIN + 4 SEMANAS' },
  ]
  let modulosCreados = 0
  let modulosActualizados = 0
  for (let orden = 0; orden < modulos.length; orden++) {
    const m = modulos[orden]
    const existente = await prisma.clase.findFirst({ where: { numeroModulo: m.numeroModulo }, select: { id: true } })
    if (existente) {
      await prisma.clase.update({ where: { id: existente.id }, data: { ...m, orden } })
      modulosActualizados++
    } else {
      await prisma.clase.create({
        data: { ...m, orden, disciplina: 'CIRCUITO', youtubeUrl: null, publicada: true },
      })
      modulosCreados++
    }
  }
  console.log(`   🎓 Academia: ${modulosCreados} módulos creados, ${modulosActualizados} actualizados`)

  console.log('✅ Seed completado')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
