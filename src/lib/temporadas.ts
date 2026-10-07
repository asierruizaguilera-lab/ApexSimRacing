import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { prisma } from './prisma'

// Temporadas fijas anuales (hora de Madrid):
//   T1 enero → abril · T2 mayo → agosto · T3 septiembre → diciembre
export const ZONA = 'Europe/Madrid'
export const MESES_POR_TEMPORADA = 4

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? ''
}

/** Mes (1-12) y año de una fecha en hora de Madrid. */
export function mesYAnio(fecha: Date = new Date()): { mes: number; anio: number } {
  const z = toZonedTime(fecha, ZONA)
  return { mes: z.getMonth() + 1, anio: z.getFullYear() }
}

export function numeroTemporadaDeMes(mes: number): number {
  return Math.floor((mes - 1) / MESES_POR_TEMPORADA) + 1
}

export function primerMesTemporada(numero: number): number {
  return (numero - 1) * MESES_POR_TEMPORADA + 1
}

/** Mes dentro de la temporada (1-4) para un mes natural. */
export function mesDentroDeTemporada(mes: number): number {
  return ((mes - 1) % MESES_POR_TEMPORADA) + 1
}

export function rangoTemporada(numero: number, anio: number): { fechaInicio: Date; fechaFin: Date } {
  const mesInicio = primerMesTemporada(numero)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fechaInicio = fromZonedTime(`${anio}-${pad(mesInicio)}-01T00:00:00`, ZONA)
  // Fin = último milisegundo antes del inicio de la siguiente temporada
  const sig = numero === 3 ? { anio: anio + 1, mes: 1 } : { anio, mes: mesInicio + MESES_POR_TEMPORADA }
  const fechaFin = new Date(fromZonedTime(`${sig.anio}-${pad(sig.mes)}-01T00:00:00`, ZONA).getTime() - 1)
  return { fechaInicio, fechaFin }
}

/** Crea las 3 temporadas del año si no existen (no toca las existentes). */
export async function asegurarTemporadasAnio(anio: number) {
  for (const numero of [1, 2, 3]) {
    await prisma.temporada.upsert({
      where: { numero_anio: { numero, anio } },
      update: {},
      create: { numero, anio, ...rangoTemporada(numero, anio) },
    })
  }
}

export async function getTemporadaDeFecha(fecha: Date = new Date()) {
  const { mes, anio } = mesYAnio(fecha)
  await asegurarTemporadasAnio(anio)
  return prisma.temporada.findUniqueOrThrow({
    where: { numero_anio: { numero: numeroTemporadaDeMes(mes), anio } },
  })
}

export async function getTemporadaActiva() {
  return prisma.temporada.findFirst({
    where: { activa: true },
    include: { cocheEquipo: true },
  })
}

/** "Temporada 2 — Mes 3/4" para la temporada activa (o null si no hay ninguna activa). */
export function etiquetaTemporada(temporada: { numero: number; anio: number }, fecha: Date = new Date()) {
  const { mes, anio } = mesYAnio(fecha)
  const enCurso = anio === temporada.anio && numeroTemporadaDeMes(mes) === temporada.numero
  const mesTemp = enCurso ? mesDentroDeTemporada(mes) : MESES_POR_TEMPORADA
  return { mesTemporada: mesTemp, texto: `Temporada ${temporada.numero} — Mes ${mesTemp}/${MESES_POR_TEMPORADA}` }
}

/** true si hoy es el último mes de la temporada activa (ventana de propuestas). */
export function esUltimoMesDeTemporada(temporada: { numero: number; anio: number }, fecha: Date = new Date()) {
  const { mes, anio } = mesYAnio(fecha)
  return anio === temporada.anio
    && numeroTemporadaDeMes(mes) === temporada.numero
    && mesDentroDeTemporada(mes) === MESES_POR_TEMPORADA
}

/**
 * Recalcula PuntosEquipoMes de un mes a partir de los resultados guardados.
 * Solo cuentan carreras de campeonatos de equipos, y el equipo es el que figura en el resultado
 * (no el equipo actual del piloto). Es idempotente: se puede llamar tantas veces como haga falta.
 */
export async function recalcularPuntosEquipoMes(mes: number, anio: number) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const desde = fromZonedTime(`${anio}-${pad(mes)}-01T00:00:00`, ZONA)
  const sig = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 }
  const hasta = fromZonedTime(`${sig.anio}-${pad(sig.mes)}-01T00:00:00`, ZONA)

  const temporada = await getTemporadaDeFecha(desde)

  const sumas = await prisma.resultado.groupBy({
    by: ['equipoId'],
    where: {
      equipoId: { not: null },
      carrera: { fecha: { gte: desde, lt: hasta }, campeonato: { esCampeonatoEquipos: true } },
    },
    _sum: { puntos: true },
  })

  const puntosPorEquipo = new Map<string, number>()
  for (const s of sumas) if (s.equipoId) puntosPorEquipo.set(s.equipoId, s._sum.puntos ?? 0)

  // Equipos que tenían fila ese mes pero ya no tienen resultados (p. ej. se corrigió un resultado) → 0
  const previas = await prisma.puntosEquipoMes.findMany({ where: { mes, anio }, select: { equipoId: true } })
  for (const p of previas) if (!puntosPorEquipo.has(p.equipoId)) puntosPorEquipo.set(p.equipoId, 0)

  const ordenados = Array.from(puntosPorEquipo.entries()).sort((a, b) => b[1] - a[1])
  let posicion = 0
  for (const [equipoId, puntos] of ordenados) {
    posicion++
    await prisma.puntosEquipoMes.upsert({
      where: { equipoId_mes_anio: { equipoId, mes, anio } },
      update: { puntos, posicion: puntos > 0 ? posicion : null, temporadaId: temporada.id },
      create: { equipoId, mes, anio, puntos, posicion: puntos > 0 ? posicion : null, temporadaId: temporada.id },
    })
  }
}

/** Ranking de equipos activos para un mes (incluye equipos sin puntos al final). */
export async function rankingEquiposMes(mes: number, anio: number) {
  const [equipos, puntos] = await Promise.all([
    prisma.equipo.findMany({
      where: { activo: true },
      select: {
        id: true, nombre: true, logoUrl: true, colorPrimario: true, descripcion: true,
        _count: { select: { miembros: true } },
      },
    }),
    prisma.puntosEquipoMes.findMany({ where: { mes, anio }, select: { equipoId: true, puntos: true } }),
  ])
  const mapa = new Map(puntos.map(p => [p.equipoId, p.puntos]))
  return equipos
    .map(e => ({ ...e, miembros: e._count.miembros, puntosMes: mapa.get(e.id) ?? 0 }))
    .sort((a, b) => b.puntosMes - a.puntosMes || a.nombre.localeCompare(b.nombre))
    .map((e, i) => ({ ...e, posicion: i + 1 }))
}

/** Equipo con más puntos en un mes concreto (null si nadie puntuó). */
export async function equipoGanadorMes(mes: number, anio: number) {
  const top = await prisma.puntosEquipoMes.findFirst({
    where: { mes, anio, puntos: { gt: 0 } },
    orderBy: { puntos: 'desc' },
    include: {
      equipo: {
        select: {
          id: true, nombre: true, logoUrl: true, colorPrimario: true,
          miembros: { select: { rol: true, user: { select: { id: true, username: true, avatar: true } } } },
        },
      },
    },
  })
  return top
}

/** Clasificación acumulada de una temporada. */
export async function rankingTemporada(temporadaId: string) {
  const sumas = await prisma.puntosEquipoMes.groupBy({
    by: ['equipoId'],
    where: { temporadaId },
    _sum: { puntos: true },
    orderBy: { _sum: { puntos: 'desc' } },
  })
  const equipos = await prisma.equipo.findMany({
    where: { id: { in: sumas.map(s => s.equipoId) } },
    select: { id: true, nombre: true, colorPrimario: true, logoUrl: true, activo: true },
  })
  const mapa = new Map(equipos.map(e => [e.id, e]))
  return sumas
    .filter(s => mapa.has(s.equipoId))
    .map(s => ({ equipo: mapa.get(s.equipoId)!, puntos: s._sum.puntos ?? 0 }))
}

/**
 * Activa la temporada que corresponde a `fecha` (creando las del año si faltan) y desactiva el resto.
 * Si no se indica coche, hereda el de la temporada activa anterior para que el garaje no quede vacío.
 */
export async function activarTemporadaActual(cocheEquipoId?: string | null, fecha: Date = new Date()) {
  const anterior = await prisma.temporada.findFirst({ where: { activa: true } })
  const objetivo = await getTemporadaDeFecha(fecha)
  const coche = cocheEquipoId !== undefined ? cocheEquipoId : (objetivo.cocheEquipoId ?? anterior?.cocheEquipoId ?? null)

  await prisma.$transaction([
    prisma.temporada.updateMany({ where: { activa: true, id: { not: objetivo.id } }, data: { activa: false } }),
    prisma.temporada.update({ where: { id: objetivo.id }, data: { activa: true, cocheEquipoId: coche } }),
  ])
  return prisma.temporada.findUniqueOrThrow({ where: { id: objetivo.id }, include: { cocheEquipo: true } })
}

/**
 * Cron: si la temporada activa ya terminó, fija el ganador, avisa a todos y activa la siguiente.
 * No hace nada si no hay temporada activa (el admin aún no ha iniciado la liga).
 */
export async function cerrarTemporadaSiTerminada(ahora: Date = new Date()) {
  const activa = await prisma.temporada.findFirst({ where: { activa: true } })
  if (!activa) return { cerrada: false, motivo: 'Sin temporada activa' }
  if (activa.fechaFin >= ahora) return { cerrada: false, motivo: 'La temporada activa sigue en curso' }

  // Por si algún resultado del último mes se guardó sin recalcular
  const ultimoMes = primerMesTemporada(activa.numero) + MESES_POR_TEMPORADA - 1
  await recalcularPuntosEquipoMes(ultimoMes, activa.anio)

  const ranking = await rankingTemporada(activa.id)
  const ganador = ranking.find(r => r.puntos > 0)?.equipo ?? null

  await prisma.temporada.update({
    where: { id: activa.id },
    data: { activa: false, equipoGanadorId: ganador?.id ?? null },
  })
  const nueva = await activarTemporadaActual(undefined, ahora)

  const mensaje = ganador
    ? `🏆 ¡${ganador.nombre} gana la Temporada ${activa.numero} de ${activa.anio}! Arranca la Temporada ${nueva.numero}.`
    : `Termina la Temporada ${activa.numero} de ${activa.anio}. ¡Arranca la Temporada ${nueva.numero}!`

  const usuarios = await prisma.user.findMany({ where: { baneado: false }, select: { id: true } })
  if (usuarios.length > 0) {
    await prisma.notificacion.createMany({
      data: usuarios.map(u => ({ userId: u.id, tipo: 'TEMPORADA' as const, mensaje, link: '/equipos' })),
    })
  }
  const io = (global as any).io
  if (io) io.emit('temporada:nueva', { numero: nueva.numero, anio: nueva.anio, ganador: ganador?.nombre ?? null })

  return { cerrada: true, ganador: ganador?.nombre ?? null, nueva: { numero: nueva.numero, anio: nueva.anio } }
}
