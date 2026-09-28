import { prisma } from './prisma'

// Anti-spam del chat: 5 mensajes en 10 segundos = 5 minutos sin poder escribir.
export const SPAM_MAX_MENSAJES = 5
export const SPAM_VENTANA_MS = 10_000
export const SPAM_BLOQUEO_MS = 5 * 60_000

/**
 * Devuelve hasta cuándo está bloqueado el usuario por spam, o null si puede escribir.
 * Se calcula a partir de sus últimos mensajes (incluidos los eliminados por un admin),
 * así que no necesita estado en memoria y sobrevive a reinicios del servidor.
 */
export async function bloqueoSpamHasta(userId: string): Promise<Date | null> {
  const ultimos = await prisma.mensajeChat.findMany({
    where: { userId },
    orderBy: { creadoEn: 'desc' },
    take: SPAM_MAX_MENSAJES,
    select: { creadoEn: true },
  })
  if (ultimos.length < SPAM_MAX_MENSAJES) return null

  const masReciente = ultimos[0].creadoEn.getTime()
  const masAntiguo = ultimos[SPAM_MAX_MENSAJES - 1].creadoEn.getTime()
  if (masReciente - masAntiguo > SPAM_VENTANA_MS) return null

  const hasta = new Date(masReciente + SPAM_BLOQUEO_MS)
  return hasta > new Date() ? hasta : null
}
