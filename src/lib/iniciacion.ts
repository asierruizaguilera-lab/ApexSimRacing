import { prisma } from './prisma'
import { CARRERAS_INICIACION, HORAS_VENTANA_FOUNDER } from './utils'

const INSCRIPCION_VIGENTE = { estado: { not: 'CANCELADA' as const } }

/** Ventana Founder abierta ahora mismo para un campeonato de iniciación. */
export function ventanaAbierta(camp: { ventanaFounderExpira: Date | null; ventanaCerrada: boolean }, ahora = new Date()) {
  return !!camp.ventanaFounderExpira && ahora < camp.ventanaFounderExpira && !camp.ventanaCerrada
}

/**
 * Campeonato de iniciación del usuario con la ventana Founder abierta (o null).
 * Solo cuenta una inscripción vigente (no cancelada).
 */
export async function getVentanaFounderUsuario(userId: string) {
  const inscripcion = await prisma.inscripcion.findFirst({
    where: {
      userId,
      ...INSCRIPCION_VIGENTE,
      campeonato: { esIniciacion: true, ventanaCerrada: false, ventanaFounderExpira: { gt: new Date() } },
    },
    include: { campeonato: { select: { id: true, nombre: true, ventanaFounderExpira: true, ventanaCerrada: true } } },
    orderBy: { campeonato: { ventanaFounderExpira: 'asc' } },
  })
  return inscripcion?.campeonato ?? null
}

/**
 * La temporada de iniciación ha terminado y su ventana Founder ya se cerró (o expiró aunque el cron
 * aún no la haya cerrado). A partir de entonces los planes se venden a precio estándar.
 */
export async function temporadaIniciacionFinalizada() {
  const camp = await prisma.campeonato.findFirst({
    where: {
      esIniciacion: true,
      OR: [{ ventanaCerrada: true }, { ventanaFounderExpira: { lte: new Date() } }],
    },
    select: { id: true },
  })
  return !!camp
}

/**
 * Se llama cada vez que una carrera pasa a FINALIZADA. Si pertenece a una iniciación y ya se ha
 * corrido la carrera 4 (o todas, si el campeonato tiene menos), abre la ventana Founder de 120h y
 * avisa a los inscritos. Idempotente: si la ventana ya se abrió no la reinicia.
 */
export async function abrirVentanaFounderSiProcede(campeonatoId: string): Promise<boolean> {
  const camp = await prisma.campeonato.findUnique({
    where: { id: campeonatoId },
    select: { id: true, esIniciacion: true, ventanaFounderExpira: true, ventanaCerrada: true, _count: { select: { carreras: true } } },
  })
  if (!camp?.esIniciacion || camp.ventanaFounderExpira || camp.ventanaCerrada) return false

  const finalizadas = await prisma.carrera.count({ where: { campeonatoId, estado: 'FINALIZADA' } })
  const objetivo = Math.min(CARRERAS_INICIACION, camp._count.carreras)
  if (objetivo === 0 || finalizadas < objetivo) return false

  const expira = new Date(Date.now() + HORAS_VENTANA_FOUNDER * 3600 * 1000)
  // updateMany con la condición de "aún sin abrir" evita abrirla dos veces si llegan dos peticiones a la vez
  const { count } = await prisma.campeonato.updateMany({
    where: { id: campeonatoId, ventanaFounderExpira: null },
    data: { ventanaFounderExpira: expira },
  })
  if (count === 0) return false

  const inscritos = await prisma.inscripcion.findMany({
    where: { campeonatoId, ...INSCRIPCION_VIGENTE },
    select: { userId: true },
  })
  if (inscritos.length > 0) {
    await prisma.notificacion.createMany({
      data: inscritos.map(i => ({
        userId: i.userId,
        tipo: 'TEMPORADA' as const,
        mensaje: '¡La temporada de iniciación ha terminado! Tienes 5 días para convertirte en Founder APEX y bloquear tu precio de por vida.',
        link: '/planes',
      })),
    })
  }
  return true
}

/**
 * Cierra la ventana Founder de un campeonato y avisa a los inscritos que no se hicieron Founder.
 * Devuelve false si ya estaba cerrada.
 */
export async function cerrarVentanaFounder(campeonatoId: string): Promise<boolean> {
  const { count } = await prisma.campeonato.updateMany({
    where: { id: campeonatoId, esIniciacion: true, ventanaCerrada: false },
    data: { ventanaCerrada: true },
  })
  if (count === 0) return false

  const pendientes = await prisma.inscripcion.findMany({
    where: { campeonatoId, ...INSCRIPCION_VIGENTE, user: { esFounder: false } },
    select: { userId: true },
  })
  if (pendientes.length > 0) {
    await prisma.notificacion.createMany({
      data: pendientes.map(i => ({
        userId: i.userId,
        tipo: 'TEMPORADA' as const,
        mensaje: 'La ventana Founder ha cerrado. A partir de ahora el acceso es a precio estándar.',
        link: '/planes',
      })),
    })
  }
  return true
}

/** Cron diario: cierra las ventanas Founder ya expiradas. */
export async function cerrarVentanasExpiradas() {
  const expiradas = await prisma.campeonato.findMany({
    where: { esIniciacion: true, ventanaCerrada: false, ventanaFounderExpira: { lte: new Date() } },
    select: { id: true, nombre: true },
  })
  const cerradas: string[] = []
  for (const c of expiradas) {
    if (await cerrarVentanaFounder(c.id)) cerradas.push(c.nombre)
  }
  return { ventanasCerradas: cerradas }
}

export type EstadoVentana = 'PENDIENTE' | 'ACTIVA' | 'CERRADA'

export function estadoVentana(camp: { ventanaFounderExpira: Date | null; ventanaCerrada: boolean }): EstadoVentana {
  if (camp.ventanaCerrada) return 'CERRADA'
  if (!camp.ventanaFounderExpira) return 'PENDIENTE'
  // Expirada pero el cron aún no la ha cerrado: a efectos de precio ya está cerrada
  return ventanaAbierta(camp) ? 'ACTIVA' : 'CERRADA'
}

/** Resumen para el dashboard admin: una fila por campeonato de iniciación. */
export async function resumenIniciacionAdmin() {
  const campeonatos = await prisma.campeonato.findMany({
    where: { esIniciacion: true },
    orderBy: { fechaInicio: 'desc' },
    select: {
      id: true, nombre: true, ventanaFounderExpira: true, ventanaCerrada: true,
      _count: { select: { carreras: true } },
      carreras: { where: { estado: 'FINALIZADA' }, select: { id: true } },
    },
  })

  return Promise.all(campeonatos.map(async c => {
    const filtroInscritos = { inscripciones: { some: { campeonatoId: c.id, ...INSCRIPCION_VIGENTE } } }
    const [pendientes, convertidos] = await Promise.all([
      prisma.user.count({ where: { ...filtroInscritos, esFounder: false } }),
      // Founders de esta ventana: se hicieron Founder desde que se abrió
      c.ventanaFounderExpira
        ? prisma.user.count({
            where: {
              ...filtroInscritos,
              esFounder: true,
              fechaFounder: { gte: new Date(c.ventanaFounderExpira.getTime() - HORAS_VENTANA_FOUNDER * 3600 * 1000) },
            },
          })
        : Promise.resolve(0),
    ])
    return {
      id: c.id,
      nombre: c.nombre,
      estado: estadoVentana(c),
      ventanaExpira: c.ventanaFounderExpira?.toISOString() ?? null,
      carrerasFinalizadas: c.carreras.length,
      totalCarreras: c._count.carreras,
      elegiblesPendientes: pendientes,
      convertidosFounder: convertidos,
    }
  }))
}
