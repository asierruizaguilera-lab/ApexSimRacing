import { prisma } from './prisma'

// Anti-spam del chat: 5 mensajes en 10 segundos = 5 minutos sin poder escribir.
export const SPAM_MAX_MENSAJES = 5
export const SPAM_VENTANA_MS = 10_000
export const SPAM_BLOQUEO_MS = 5 * 60_000

/** Aplica la regla anti-spam a las fechas de los últimos mensajes (más reciente primero). */
function bloqueoDesde(ultimos: { creadoEn: Date }[]): Date | null {
  if (ultimos.length < SPAM_MAX_MENSAJES) return null

  const masReciente = ultimos[0].creadoEn.getTime()
  const masAntiguo = ultimos[SPAM_MAX_MENSAJES - 1].creadoEn.getTime()
  if (masReciente - masAntiguo > SPAM_VENTANA_MS) return null

  const hasta = new Date(masReciente + SPAM_BLOQUEO_MS)
  return hasta > new Date() ? hasta : null
}

const ULTIMOS = { orderBy: { creadoEn: 'desc' as const }, take: SPAM_MAX_MENSAJES, select: { creadoEn: true } }

/**
 * Devuelve hasta cuándo está bloqueado el usuario por spam, o null si puede escribir.
 * Se calcula a partir de sus últimos mensajes (incluidos los eliminados por un admin),
 * así que no necesita estado en memoria y sobrevive a reinicios del servidor.
 */
export async function bloqueoSpamHasta(userId: string): Promise<Date | null> {
  return bloqueoDesde(await prisma.mensajeChat.findMany({ where: { userId }, ...ULTIMOS }))
}

/** Mismo límite para el chat de equipo. */
export async function bloqueoSpamEquipoHasta(userId: string): Promise<Date | null> {
  return bloqueoDesde(await prisma.mensajeEquipo.findMany({ where: { userId }, ...ULTIMOS }))
}

/** Mismo límite para los mensajes directos (contando todos los que envía, a cualquier destinatario). */
export async function bloqueoSpamDMHasta(userId: string): Promise<Date | null> {
  return bloqueoDesde(await prisma.mensajeDirecto.findMany({ where: { remitenteId: userId }, ...ULTIMOS }))
}
