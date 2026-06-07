import { PrismaClient, Rol, Disciplina, PlanSuscripcion } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de APEX...')

  const totalUsuarios = await prisma.user.count()
  if (totalUsuarios > 0) {
    console.log(`⏭️  Base de datos ya tiene ${totalUsuarios} usuarios — seed omitido para proteger datos reales.`)
    return
  }

  // ADMIN
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

  // COCHES — catálogo completo
  const cochesData = [
    // ROOKIE
    { nombre: 'Peugeot 106 Rally', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ROOKIE, descripcion: 'El clásico de iniciación al rally. Ligero y predecible.', modAC: 'ks_peugeot_106_rally' },
    { nombre: 'Citroën Saxo Kit Car', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ROOKIE, descripcion: 'Kit Car de finales de los 90. Gran referencia para principiantes.', modAC: 'citroen_saxo_kitcar' },
    { nombre: 'Kart 125cc Básico', disciplina: Disciplina.KARTCROSS, planMinimo: PlanSuscripcion.ROOKIE, descripcion: 'El punto de partida de todo piloto. Kart de competición básico.' },
    { nombre: 'Honda Civic EG6', disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ROOKIE, descripcion: 'Icono del tuning japonés adaptado para pista.', modAC: 'honda_civic_eg6' },
    { nombre: 'Formula Ford', disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.ROOKIE, descripcion: 'El primer monoplaza de muchos campeones. Sencillo y efectivo.', modAC: 'formula_ford_1600' },
    // AMATEUR
    { nombre: 'Mitsubishi Lancer Evo VI', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.AMATEUR, descripcion: 'La bestia japonesa del WRC de los 2000.', modAC: 'mitsubishi_lancer_evo6' },
    { nombre: 'Subaru Impreza WRX STI', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.AMATEUR, descripcion: 'Rival eterno del Evo. Sonido de boxer legendario.', modAC: 'subaru_impreza_sti' },
    { nombre: 'BMW E30 M3', disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.AMATEUR, descripcion: 'Leyenda del motorsport de los 80. Equilibrio perfecto.', modAC: 'ks_bmw_m3_e30' },
    { nombre: 'Nissan S13 Drift', disciplina: Disciplina.DRIFT, planMinimo: PlanSuscripcion.AMATEUR, descripcion: 'El coche de drift más popular de la comunidad.', modAC: 'nissan_silvia_s13' },
    { nombre: 'Formula Renault 2.0', disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.AMATEUR, descripcion: 'Monoplaza junior con buena carga aerodinámica.', modAC: 'formula_renault_2000' },
    // PRO
    { nombre: 'Ford Fiesta Rally2', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.PRO, descripcion: 'Rally2 de última generación. Potente y tecnológico.', modAC: 'ford_fiesta_rally2' },
    { nombre: 'Škoda Fabia Rally2', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.PRO, descripcion: 'El más usado en WRC2. Precisión checa al máximo.', modAC: 'skoda_fabia_rally2' },
    { nombre: 'Porsche 911 GT3 R', disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.PRO, descripcion: 'El GT3 de referencia. Sonido y comportamiento únicos.', modAC: 'ks_porsche_911_gt3_r' },
    { nombre: 'Nissan GT-R R35 Drift', disciplina: Disciplina.DRIFT, planMinimo: PlanSuscripcion.PRO, descripcion: 'La Godzilla convertida en máquina de drift.', modAC: 'nissan_gtr_drift' },
    { nombre: 'Dallara F3', disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.PRO, descripcion: 'Fórmula 3 oficial. Paso previo a la F2 y F1.', modAC: 'dallara_f3' },
    // ELITE
    { nombre: 'Toyota GR Yaris Rally1', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ELITE, descripcion: 'El campeón del WRC 2022-2024. Tecnología híbrida al máximo.', modAC: 'toyota_gr_yaris_rally1' },
    { nombre: 'Ford Puma Rally1', disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ELITE, descripcion: 'La bestia de M-Sport en el WRC moderno.', modAC: 'ford_puma_rally1' },
    { nombre: 'Ferrari 488 GT3', disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ELITE, descripcion: 'El Cavallino Rampante en GT3. Sonido y estilo inigualables.', modAC: 'ferrari_488_gt3' },
    { nombre: 'Lamborghini Huracán GT3', disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ELITE, descripcion: 'El toro desencadenado en pista. Agresivo y espectacular.', modAC: 'lamborghini_huracan_gt3' },
    { nombre: 'Dallara F2', disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.ELITE, descripcion: 'La antesala de la Fórmula 1. La cúspide del SimRacing.', modAC: 'dallara_f2' },
  ]

  const cochesCreados: Awaited<ReturnType<typeof prisma.coche.create>>[] = []
  for (const c of cochesData) {
    const coche = await prisma.coche.create({ data: c })
    cochesCreados.push(coche)
  }

  // Admin: plan Elite gratuito permanente
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

  // Desbloquear todos los coches para el admin
  await prisma.cocheDesbloqueado.createMany({
    data: cochesCreados.map(c => ({ userId: admin.id, cocheId: c.id })),
    skipDuplicates: true,
  })

  console.log('✅ Seed completado:')
  console.log(`   - 1 admin: admin@apex.gg / admin123 — plan Elite gratuito permanente`)
  console.log(`   - ${cochesCreados.length} coches en catálogo (Rookie×5, Amateur×5, Pro×5, Elite×5)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
