import { PrismaClient, Rol, Disciplina, PlanSuscripcion, UbicacionPatrocinador } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sincronizarCoches } from './coches-catalogo'

const prisma = new PrismaClient()

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

  // ── 1b. Catálogo de coches — sincronización no destructiva (nunca toca usuarios) ──
  const resumenCoches = await sincronizarCoches(prisma, { force: false })
  console.log(
    `   🚗 Coches: ${resumenCoches.creados.length} creados, ${resumenCoches.renombrados.length} renombrados, ` +
    `${resumenCoches.actualizados.length} actualizados, ${resumenCoches.eliminados.length} eliminados, ` +
    `${resumenCoches.desbloqueosNuevos} desbloqueos nuevos`
  )

  // ── 2. Clases de Academia — solo si no hay ninguna ────────────────────────
  const totalClases = await prisma.clase.count()
  if (totalClases === 0) {
    const clasesData = [
      {
        titulo: 'Técnica de frenada en tierra',
        descripcion: 'Aprende a frenar correctamente en superficies de tierra: dosificación del freno, punto de frenada y transferencia de peso.',
        disciplina: Disciplina.RALLY,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 12,
        orden: 1,
        publicada: true,
      },
      {
        titulo: 'Setup de suspensión para rally',
        descripcion: 'Configuración de la suspensión en etapas de tierra y asfalto. Altura, rigidez y diferencial.',
        disciplina: Disciplina.RALLY,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 18,
        orden: 2,
        publicada: true,
      },
      {
        titulo: 'Trazada perfecta en chicane',
        descripcion: 'La geometría de la trazada en chicanes apretadas: cómo minimizar pérdida de tiempo y proteger los neumáticos.',
        disciplina: Disciplina.CIRCUITO,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 10,
        orden: 1,
        publicada: true,
      },
      {
        titulo: 'Gestión de neumáticos en carrera',
        descripcion: 'Estrategias de ahorro de goma, reconocimiento del degradado y cómo adaptar la conducción en las últimas vueltas.',
        disciplina: Disciplina.CIRCUITO,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 15,
        orden: 2,
        publicada: true,
      },
      {
        titulo: 'Iniciación al drift con handbrake',
        descripcion: 'Primeros pasos en el drift: uso del freno de mano, iniciación del sobreviraje y control del ángulo.',
        disciplina: Disciplina.DRIFT,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 20,
        orden: 1,
        publicada: true,
      },
      {
        titulo: 'Técnica de salida en tierra',
        descripcion: 'Cómo conseguir la salida perfecta en kartcross: embrague, aceleración y control de la tracción.',
        disciplina: Disciplina.KARTCROSS,
        youtubeUrl: 'dQw4w9WgXcQ',
        duracionMin: 8,
        orden: 1,
        publicada: true,
      },
    ]

    await prisma.clase.createMany({ data: clasesData })
    console.log(`   ✅ ${clasesData.length} clases de Academia creadas`)
  } else {
    console.log(`   ⏭️  Ya existen ${totalClases} clases — omitiendo seed de Academia`)
  }

  // ── 3. Vadosan — colaborador técnico de Academia ─────────────────────────────
  const vadosan = await prisma.patrocinador.findFirst({ where: { nombre: 'Vadosan' } })
  if (!vadosan) {
    await prisma.patrocinador.create({
      data: {
        nombre: 'Vadosan',
        descripcion: 'Colaborador técnico — Mecánica, técnica de pilotaje y conocimiento de circuitos',
        logoUrl: null,
        linkExterno: null,
        ubicaciones: [UbicacionPatrocinador.ACADEMIA],
        activo: true,
        esColaborador: true,
        orden: 0,
      },
    })
    console.log('   ✅ Vadosan (colaborador técnico Academia) creado')
  } else {
    console.log('   ⏭️  Vadosan ya existe — omitiendo')
  }

  // ── 4. Patrocinadores placeholder ────────────────────────────────────────────
  const placeholders = [
    {
      nombre: 'Tu Marca Aquí',
      descripcion: '¿Quieres llegar a la comunidad del motor hispanohablante? Contáctanos.',
      logoUrl: null as string | null,
      linkExterno: null as string | null,
      ubicaciones: [UbicacionPatrocinador.TODAS],
      activo: true,
      esColaborador: false,
      orden: 1,
    },
    {
      nombre: 'Patrocinador Oficial',
      descripcion: 'Colaborador oficial de APEX SimRacing.',
      logoUrl: null as string | null,
      linkExterno: null as string | null,
      ubicaciones: [UbicacionPatrocinador.TODAS],
      activo: true,
      esColaborador: false,
      orden: 2,
    },
  ]

  let placeholdersCreados = 0
  let placeholdersActualizados = 0
  for (const p of placeholders) {
    const existing = await prisma.patrocinador.findFirst({ where: { nombre: p.nombre } })
    if (!existing) {
      await prisma.patrocinador.create({ data: p })
      placeholdersCreados++
    } else if (!existing.ubicaciones.includes(UbicacionPatrocinador.TODAS)) {
      await prisma.patrocinador.update({
        where: { id: existing.id },
        data: { ubicaciones: [UbicacionPatrocinador.TODAS], activo: true },
      })
      placeholdersActualizados++
    }
  }
  if (placeholdersCreados > 0) console.log(`   ✅ ${placeholdersCreados} patrocinadores placeholder creados`)
  if (placeholdersActualizados > 0) console.log(`   ✅ ${placeholdersActualizados} patrocinadores placeholder actualizados a TODAS`)
  if (placeholdersCreados === 0 && placeholdersActualizados === 0) {
    console.log('   ⏭️  Placeholders ya correctos — omitiendo')
  }

  console.log('✅ Seed completado')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
