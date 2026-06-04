import { PrismaClient, Rol, Disciplina, Simulador, EstadoCampeonato, EstadoCarrera, EstadoInscripcion, CanalChat, TipoNotificacion } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PUNTOS_F1 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

async function main() {
  console.log('🌱 Iniciando seed de APEX...')

  // Limpiar datos existentes
  await prisma.notificacion.deleteMany()
  await prisma.mensajeChat.deleteMany()
  await prisma.resultado.deleteMany()
  await prisma.sistemaPuntos.deleteMany()
  await prisma.inscripcion.deleteMany()
  await prisma.carrera.deleteMany()
  await prisma.campeonato.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

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

  // PILOTOS
  const pilotosData = [
    { username: 'VelocidadMax', email: 'max@apex.gg', pais: 'ES', bio: 'Especialista en Rally. WRC es mi vida.' },
    { username: 'TurboKarlos', email: 'karlos@apex.gg', pais: 'ES', bio: 'Piloto de circuito, Assetto Corsa addict.' },
    { username: 'DriftKing_MX', email: 'drift@apex.gg', pais: 'MX', bio: 'El rey del drift de Latinoamérica.' },
    { username: 'RallyJavi', email: 'javi@apex.gg', pais: 'ES', bio: 'Catalunya es mi circuito favorito.' },
    { username: 'PedroPedal', email: 'pedro@apex.gg', pais: 'AR', bio: 'Buenos Aires Racing Team.' },
    { username: 'AlonsoDeLuz', email: 'alonso@apex.gg', pais: 'ES', bio: 'F1 enjoyer, monoplazas forever.' },
    { username: 'NitroColombia', email: 'nitro@apex.gg', pais: 'CO', bio: 'Representando a Colombia en la pista.' },
    { username: 'SergioCR7', email: 'sergio@apex.gg', pais: 'ES', bio: 'Racing since 2020.' },
    { username: 'LatinoSpeed', email: 'latino@apex.gg', pais: 'CL', bio: 'Chile Racing Community.' },
    { username: 'MadridRacer', email: 'madrid@apex.gg', pais: 'ES', bio: 'Desde las calles de Madrid a las pistas virtuales.' },
    { username: 'CarlosVegas', email: 'cvegas@apex.gg', pais: 'VE', bio: 'Venezuela en el podio.' },
    { username: 'SilverArrow99', email: 'silver@apex.gg', pais: 'ES', bio: 'Apasionado del automovilismo clásico.' },
    { username: 'UrbanDrifter', email: 'urban@apex.gg', pais: 'MX', bio: 'Drift y más drift.' },
    { username: 'RuedaLibre', email: 'rueda@apex.gg', pais: 'PE', bio: 'Perú en la competición.' },
    { username: 'CircuitoMaster', email: 'circuito@apex.gg', pais: 'ES', bio: 'GT3 specialist.' },
  ]

  const pilotos: Awaited<ReturnType<typeof prisma.user.create>>[] = []
  for (const p of pilotosData) {
    const password = await bcrypt.hash('piloto123', 12)
    const piloto = await prisma.user.create({
      data: { ...p, password, role: Rol.PILOTO },
    })
    pilotos.push(piloto)
  }

  // CAMPEONATO 1: ACTIVO — Assetto Corsa GT Series
  const camp1 = await prisma.campeonato.create({
    data: {
      nombre: 'APEX GT Series 2025',
      disciplina: Disciplina.CIRCUITO,
      simulador: Simulador.ASSETTO_CORSA,
      descripcion: 'La competición de GT3 más exigente de la comunidad hispanohablante. 8 rondas en los circuitos más icónicos del mundo. Coches GT3 con físicas realistas en Assetto Corsa. ¿Tienes lo que se necesita para llegar al podio?',
      estado: EstadoCampeonato.ACTIVO,
      fechaInicio: new Date('2025-03-01'),
      fechaFin: new Date('2025-10-31'),
      maxPilotos: 20,
      modsReq: 'GT3 Pack v2.1 — https://assetto-mods.example.com/gt3pack\nSolid Racers Sound Pack — https://assetto-mods.example.com/sound',
    },
  })

  // Sistema de puntos camp1
  for (let i = 0; i < PUNTOS_F1.length; i++) {
    await prisma.sistemaPuntos.create({
      data: { campeonatoId: camp1.id, posicion: i + 1, puntos: PUNTOS_F1[i] },
    })
  }
  await prisma.sistemaPuntos.create({
    data: { campeonatoId: camp1.id, posicion: 99, puntos: 1 }, // vuelta rápida
  })

  // Carreras camp1
  const carrerasCamp1 = [
    { nombre: 'Ronda 1 — Monza', circuito: 'Autodromo Nazionale di Monza', fecha: new Date('2025-04-05T20:00:00'), estado: EstadoCarrera.FINALIZADA, servidorIP: '185.23.44.12:9600', servidorPassword: 'apex2025' },
    { nombre: 'Ronda 2 — Spa', circuito: 'Circuit de Spa-Francorchamps', fecha: new Date('2025-05-10T20:00:00'), estado: EstadoCarrera.FINALIZADA, servidorIP: '185.23.44.12:9600', servidorPassword: 'apex2025' },
    { nombre: 'Ronda 3 — Nürburgring', circuito: 'Nürburgring GP', fecha: new Date('2025-06-14T20:00:00'), estado: EstadoCarrera.PROGRAMADA, servidorIP: '185.23.44.12:9600', servidorPassword: 'apex2025' },
    { nombre: 'Ronda 4 — Silverstone', circuito: 'Silverstone Circuit', fecha: new Date('2025-07-12T20:00:00'), estado: EstadoCarrera.PROGRAMADA, servidorIP: '185.23.44.12:9600', servidorPassword: 'apex2025' },
  ]

  const carrerasCreadas1 = []
  for (const c of carrerasCamp1) {
    const carrera = await prisma.carrera.create({
      data: { campeonatoId: camp1.id, duracionMin: 75, ...c },
    })
    carrerasCreadas1.push(carrera)
  }

  // CAMPEONATO 2: PRÓXIMO — WRC Dirt Rally
  const camp2 = await prisma.campeonato.create({
    data: {
      nombre: 'WRC APEX Rally Cup 2025',
      disciplina: Disciplina.RALLY,
      simulador: Simulador.EA_WRC,
      descripcion: 'El campeonato de rally más emocionante de la plataforma. Etapas en tierra, asfalto y nieve. Sistema de tiempos acumulados. Uno de los más exigentes: cada segundo cuenta.',
      estado: EstadoCampeonato.PROXIMO,
      fechaInicio: new Date('2025-09-01'),
      fechaFin: new Date('2025-12-15'),
      maxPilotos: 30,
    },
  })

  for (let i = 0; i < PUNTOS_F1.length; i++) {
    await prisma.sistemaPuntos.create({
      data: { campeonatoId: camp2.id, posicion: i + 1, puntos: PUNTOS_F1[i] },
    })
  }

  const carrerasCamp2 = [
    { nombre: 'Rally de España — SS1', circuito: 'Salou-Riudecanyes', fecha: new Date('2025-09-06T19:00:00'), estado: EstadoCarrera.PROGRAMADA },
    { nombre: 'Rally de Finlandia — SS1', circuito: 'Jyväskylä', fecha: new Date('2025-10-04T19:00:00'), estado: EstadoCarrera.PROGRAMADA },
    { nombre: 'Rally de Gales — SS1', circuito: 'Llandudno', fecha: new Date('2025-11-01T19:00:00'), estado: EstadoCarrera.PROGRAMADA },
  ]

  for (const c of carrerasCamp2) {
    await prisma.carrera.create({
      data: { campeonatoId: camp2.id, duracionMin: 45, ...c },
    })
  }

  // CAMPEONATO 3: FINALIZADO — Drift Championship
  const camp3 = await prisma.campeonato.create({
    data: {
      nombre: 'APEX Drift Open 2024',
      disciplina: Disciplina.DRIFT,
      simulador: Simulador.ASSETTO_CORSA,
      descripcion: 'El primer campeonato de drift organizado por APEX. Una competición épica con los mejores drifters hispanohablantes. ¡Revive los mejores momentos!',
      estado: EstadoCampeonato.FINALIZADO,
      fechaInicio: new Date('2024-09-01'),
      fechaFin: new Date('2024-12-20'),
      maxPilotos: 16,
    },
  })

  for (let i = 0; i < PUNTOS_F1.length; i++) {
    await prisma.sistemaPuntos.create({
      data: { campeonatoId: camp3.id, posicion: i + 1, puntos: PUNTOS_F1[i] },
    })
  }

  const carrerasCamp3 = [
    { nombre: 'Ronda 1 — Drift Matsuri', circuito: 'Ebisu East', fecha: new Date('2024-10-05T20:00:00'), estado: EstadoCarrera.FINALIZADA },
    { nombre: 'Final — Battle of Champions', circuito: 'Tsukuba Circuit', fecha: new Date('2024-11-30T20:00:00'), estado: EstadoCarrera.FINALIZADA },
  ]

  const carrerasCreadas3 = []
  for (const c of carrerasCamp3) {
    const carrera = await prisma.carrera.create({
      data: { campeonatoId: camp3.id, duracionMin: 90, ...c },
    })
    carrerasCreadas3.push(carrera)
  }

  // INSCRIPCIONES en campeonato activo (camp1)
  const pilotosParaCamp1 = pilotos.slice(0, 12)
  for (const p of pilotosParaCamp1) {
    await prisma.inscripcion.create({
      data: { userId: p.id, campeonatoId: camp1.id, estado: EstadoInscripcion.CONFIRMADA },
    })
  }

  // INSCRIPCIONES en campeonato finalizado (camp3)
  const pilotosParaCamp3 = [pilotos[2], pilotos[3], pilotos[6], pilotos[9], pilotos[12], pilotos[4], pilotos[7], pilotos[1]]
  for (const p of pilotosParaCamp3) {
    await prisma.inscripcion.create({
      data: { userId: p.id, campeonatoId: camp3.id, estado: EstadoInscripcion.CONFIRMADA },
    })
  }

  // RESULTADOS — Ronda 1 Monza (camp1, carrera 0)
  const resultadosMonza = [
    { userId: pilotos[0].id, posicion: 1, tiempo: '1:23:45.234', vueltaRapida: false },
    { userId: pilotos[1].id, posicion: 2, tiempo: '1:23:47.891', vueltaRapida: true },
    { userId: pilotos[3].id, posicion: 3, tiempo: '1:23:52.103', vueltaRapida: false },
    { userId: pilotos[4].id, posicion: 4, tiempo: '1:24:01.456', vueltaRapida: false },
    { userId: pilotos[5].id, posicion: 5, tiempo: '1:24:15.789', vueltaRapida: false },
    { userId: pilotos[6].id, posicion: 6, tiempo: '1:24:22.012', vueltaRapida: false },
    { userId: pilotos[7].id, posicion: 7, tiempo: '1:24:35.345', vueltaRapida: false },
    { userId: pilotos[8].id, posicion: 8, tiempo: '1:24:50.678', vueltaRapida: false },
    { userId: pilotos[9].id, posicion: 9, tiempo: '1:25:02.901', vueltaRapida: false },
    { userId: pilotos[10].id, posicion: 10, tiempo: '1:25:18.234', vueltaRapida: false },
  ]

  for (const r of resultadosMonza) {
    const pts = PUNTOS_F1[r.posicion - 1] || 0
    const ptsTotal = r.vueltaRapida ? pts + 1 : pts
    await prisma.resultado.create({
      data: { carreraId: carrerasCreadas1[0].id, puntos: ptsTotal, ...r },
    })
  }

  // RESULTADOS — Ronda 2 Spa (camp1, carrera 1)
  const resultadosSpa = [
    { userId: pilotos[3].id, posicion: 1, tiempo: '1:45:12.234', vueltaRapida: true },
    { userId: pilotos[0].id, posicion: 2, tiempo: '1:45:18.456', vueltaRapida: false },
    { userId: pilotos[5].id, posicion: 3, tiempo: '1:45:30.789', vueltaRapida: false },
    { userId: pilotos[1].id, posicion: 4, tiempo: '1:45:45.012', vueltaRapida: false },
    { userId: pilotos[8].id, posicion: 5, tiempo: '1:46:01.345', vueltaRapida: false },
    { userId: pilotos[6].id, posicion: 6, tiempo: '1:46:15.678', vueltaRapida: false },
    { userId: pilotos[4].id, posicion: 7, tiempo: '1:46:30.901', vueltaRapida: false },
    { userId: pilotos[9].id, posicion: 8, tiempo: '1:46:45.234', vueltaRapida: false },
    { userId: pilotos[7].id, posicion: 9, tiempo: 'DNF', vueltaRapida: false, abandono: true },
    { userId: pilotos[2].id, posicion: 10, tiempo: 'DNF', vueltaRapida: false, abandono: true },
  ]

  for (const r of resultadosSpa) {
    const pts = (r as any).abandono ? 0 : (PUNTOS_F1[r.posicion - 1] || 0)
    const ptsTotal = r.vueltaRapida ? pts + 1 : pts
    await prisma.resultado.create({
      data: { carreraId: carrerasCreadas1[1].id, puntos: ptsTotal, abandono: false, ...r },
    })
  }

  // RESULTADOS — Campeonato Drift (camp3)
  const resultadosDrift1 = [
    { userId: pilotos[2].id, posicion: 1, tiempo: '98.5 pts', vueltaRapida: false },
    { userId: pilotos[12].id, posicion: 2, tiempo: '94.2 pts', vueltaRapida: false },
    { userId: pilotos[4].id, posicion: 3, tiempo: '91.8 pts', vueltaRapida: false },
    { userId: pilotos[7].id, posicion: 4, tiempo: '88.3 pts', vueltaRapida: false },
    { userId: pilotos[9].id, posicion: 5, tiempo: '85.1 pts', vueltaRapida: false },
    { userId: pilotos[3].id, posicion: 6, tiempo: '82.6 pts', vueltaRapida: false },
  ]

  for (const r of resultadosDrift1) {
    const pts = PUNTOS_F1[r.posicion - 1] || 0
    await prisma.resultado.create({
      data: { carreraId: carrerasCreadas3[0].id, puntos: pts, ...r },
    })
  }

  const resultadosDrift2 = [
    { userId: pilotos[2].id, posicion: 1, tiempo: '96.7 pts', vueltaRapida: false },
    { userId: pilotos[9].id, posicion: 2, tiempo: '93.4 pts', vueltaRapida: false },
    { userId: pilotos[12].id, posicion: 3, tiempo: '90.1 pts', vueltaRapida: false },
    { userId: pilotos[1].id, posicion: 4, tiempo: '87.8 pts', vueltaRapida: false },
    { userId: pilotos[7].id, posicion: 5, tiempo: '84.5 pts', vueltaRapida: false },
    { userId: pilotos[4].id, posicion: 6, tiempo: '81.2 pts', vueltaRapida: false },
  ]

  for (const r of resultadosDrift2) {
    const pts = PUNTOS_F1[r.posicion - 1] || 0
    await prisma.resultado.create({
      data: { carreraId: carrerasCreadas3[1].id, puntos: pts, ...r },
    })
  }

  // Actualizar stats de pilotos
  const allUsers = await prisma.user.findMany()
  for (const user of allUsers) {
    if (user.role === Rol.ADMIN) continue
    const resultados = await prisma.resultado.findMany({ where: { userId: user.id } })
    const totalPuntos = resultados.reduce((s, r) => s + r.puntos, 0)
    const totalCarreras = resultados.filter(r => !r.abandono).length
    const totalVictorias = resultados.filter(r => r.posicion === 1).length
    const totalPodios = resultados.filter(r => r.posicion <= 3).length
    await prisma.user.update({
      where: { id: user.id },
      data: { totalPuntos, totalCarreras, totalVictorias, totalPodios },
    })
  }

  // MENSAJES DE CHAT — #general
  const mensajesGeneral = [
    { userId: pilotos[0].id, canal: CanalChat.GENERAL, contenido: '¡Buenas a todos! ¿Alguien listo para Nürburgring?' },
    { userId: pilotos[1].id, canal: CanalChat.GENERAL, contenido: 'El Nürb va a estar brutal. Ese circuito en GT3 es un desafío total.' },
    { userId: pilotos[3].id, canal: CanalChat.GENERAL, contenido: 'Vengo de ganar en Spa, estoy en racha 🔥' },
    { userId: pilotos[0].id, canal: CanalChat.GENERAL, contenido: 'Jajaja, disfrutalo que en el Nürb te como la paella' },
    { userId: pilotos[5].id, canal: CanalChat.GENERAL, contenido: '¿A qué hora es exactamente el próximo evento?' },
    { userId: admin.id, canal: CanalChat.GENERAL, contenido: 'La ronda 3 (Nürburgring) es el sábado a las 20:00 CET. ¡Poneos el despertador!' },
    { userId: pilotos[7].id, canal: CanalChat.GENERAL, contenido: 'Llevo toda la semana entrenando líneas en el Nürb. Creo que tengo sector 1 muy optimizado.' },
    { userId: pilotos[4].id, canal: CanalChat.GENERAL, contenido: 'La lluvia puede aparecer según el pronóstico del juego. Preparad los setups de lluvia.' },
    { userId: pilotos[2].id, canal: CanalChat.GENERAL, contenido: '¿Alguien quiere hacer alguna sesión de práctica esta semana?' },
    { userId: pilotos[6].id, canal: CanalChat.GENERAL, contenido: 'Yo me apunto a practicar. ¿Miércoles por la noche?' },
    { userId: pilotos[2].id, canal: CanalChat.GENERAL, contenido: 'Perfecto, miércoles 21:00 en el server de práctica de APEX.' },
    { userId: pilotos[8].id, canal: CanalChat.GENERAL, contenido: 'Qué buena comunidad hay aquí, sigo impresionado' },
    { userId: pilotos[9].id, canal: CanalChat.GENERAL, contenido: 'El campeonato de drift fue épico. Ganas de que vuelva.' },
    { userId: pilotos[12].id, canal: CanalChat.GENERAL, contenido: 'Para el drift tuve que estudiar muchas líneas. Vale mucho la pena.' },
    { userId: pilotos[10].id, canal: CanalChat.GENERAL, contenido: '¿Cuándo se anuncia el próximo campeonato de F1?' },
    { userId: admin.id, canal: CanalChat.GENERAL, contenido: 'Estamos preparando algo muy especial para finales de año. Pronto habrá anuncios.' },
    { userId: pilotos[11].id, canal: CanalChat.GENERAL, contenido: 'APEX sigue creciendo. Cuando empecé éramos 5, ahora somos 15+ pilotos. Brutal.' },
    { userId: pilotos[1].id, canal: CanalChat.GENERAL, contenido: 'Los setups compartidos en Discord han mejorado mucho mi tiempo. Gracias a todos.' },
    { userId: pilotos[3].id, canal: CanalChat.GENERAL, contenido: 'El Spa fue la carrera más emocionante que he hecho. Esas curvas en lluvia...' },
    { userId: pilotos[0].id, canal: CanalChat.GENERAL, contenido: 'Monza fue mi primera victoria en APEX. Un recuerdo que no voy a olvidar.' },
  ]

  const mensajesRally = [
    { userId: pilotos[0].id, canal: CanalChat.RALLY, contenido: '¿Alguien ha probado el EA WRC en PC con volante? ¿Qué tal las físicas?' },
    { userId: pilotos[3].id, canal: CanalChat.RALLY, contenido: 'Con volante es otro nivel. El force feedback en tierra es brutal.' },
    { userId: pilotos[6].id, canal: CanalChat.RALLY, contenido: 'Vengo de Dirt Rally 2.0 y el EA WRC me parece más accesible pero igual de adictivo.' },
    { userId: pilotos[0].id, canal: CanalChat.RALLY, contenido: 'El rally es completamente diferente al circuito. La nota del copiloto es clave.' },
    { userId: pilotos[14].id, canal: CanalChat.RALLY, contenido: 'Llevo practicando el rally de España toda la semana. Ese asfalto es traicionero.' },
    { userId: pilotos[3].id, canal: CanalChat.RALLY, contenido: 'España es mi favorita. Ese asfalto en calor, el coche derrapa justo como quieres.' },
    { userId: pilotos[0].id, canal: CanalChat.RALLY, contenido: 'El rally de Finlandia es el que más respeto me da. Los saltos son peligrosos.' },
    { userId: pilotos[6].id, canal: CanalChat.RALLY, contenido: 'Finlandia es el más rápido del WRC. Tienes que comprometerte al 100% en los saltos.' },
    { userId: pilotos[14].id, canal: CanalChat.RALLY, contenido: '¿Alguien tiene setups para Finlandia compartidos? Mi coche vuela pero no en el buen sentido.' },
    { userId: pilotos[3].id, canal: CanalChat.RALLY, contenido: 'Te mando el mío por DM, llevo días afinándolo.' },
    { userId: pilotos[0].id, canal: CanalChat.RALLY, contenido: 'La copa rally de APEX va a ser épica. Espero que se inscriba mucha gente.' },
    { userId: admin.id, canal: CanalChat.RALLY, contenido: 'Ya tenemos 8 pre-inscritos para el WRC Rally Cup. ¡Seguimos creciendo!' },
  ]

  for (const m of [...mensajesGeneral, ...mensajesRally]) {
    await prisma.mensajeChat.create({ data: m })
  }

  // NOTIFICACIONES
  const inscritosIds = pilotosParaCamp1.map(p => p.id)
  for (const uid of inscritosIds) {
    await prisma.notificacion.create({
      data: {
        userId: uid,
        tipo: TipoNotificacion.INSCRIPCION_CONFIRMADA,
        mensaje: 'Tu inscripción al APEX GT Series 2025 ha sido confirmada. ¡Prepárate para competir!',
        link: `/campeonatos/${camp1.id}`,
      },
    })
    await prisma.notificacion.create({
      data: {
        userId: uid,
        tipo: TipoNotificacion.RESULTADO_PUBLICADO,
        mensaje: 'Los resultados de la Ronda 1 — Monza han sido publicados. Consulta tu posición.',
        link: `/campeonatos/${camp1.id}`,
      },
    })
    await prisma.notificacion.create({
      data: {
        userId: uid,
        tipo: TipoNotificacion.RESULTADO_PUBLICADO,
        mensaje: 'Los resultados de la Ronda 2 — Spa han sido publicados.',
        link: `/campeonatos/${camp1.id}`,
      },
    })
  }

  // Notificación nuevo campeonato para todos
  for (const p of pilotos) {
    await prisma.notificacion.create({
      data: {
        userId: p.id,
        tipo: TipoNotificacion.NUEVO_CAMPEONATO,
        mensaje: 'Nuevo campeonato disponible: WRC APEX Rally Cup 2025. ¡Inscríbete ahora!',
        link: `/campeonatos/${camp2.id}`,
      },
    })
  }

  console.log('✅ Seed completado:')
  console.log(`   - 1 admin (admin@apex.gg / admin123)`)
  console.log(`   - ${pilotos.length} pilotos (contraseña: piloto123)`)
  console.log(`   - 3 campeonatos (activo, próximo, finalizado)`)
  console.log(`   - ${carrerasCamp1.length + carrerasCamp2.length + carrerasCamp3.length} carreras`)
  console.log(`   - ${mensajesGeneral.length + mensajesRally.length} mensajes de chat`)
  console.log(`   - Notificaciones generadas para todos los pilotos`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
