import { prisma } from './prisma'

interface UltimoMensaje {
  id: string
  remitenteId: string
  destinatarioId: string
  contenido: string
  leido: boolean
  creadoEn: Date
  otro: string
}

/** Lista de conversaciones (último mensaje con cada usuario), más recientes primero. */
export async function getConversaciones(userId: string) {
  // DISTINCT ON se queda con el mensaje más reciente de cada conversación en una sola consulta
  const ultimos = await prisma.$queryRaw<UltimoMensaje[]>`
    SELECT DISTINCT ON (otro) id, "remitenteId", "destinatarioId", contenido, leido, "creadoEn", otro
    FROM (
      SELECT m.*, CASE WHEN m."remitenteId" = ${userId} THEN m."destinatarioId" ELSE m."remitenteId" END AS otro
      FROM mensajes_directos m
      WHERE m."remitenteId" = ${userId} OR m."destinatarioId" = ${userId}
    ) t
    ORDER BY otro, "creadoEn" DESC
  `
  if (ultimos.length === 0) return []

  const [usuarios, noLeidos] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ultimos.map(u => u.otro) } },
      select: { id: true, username: true, avatar: true, role: true },
    }),
    prisma.mensajeDirecto.groupBy({
      by: ['remitenteId'],
      where: { destinatarioId: userId, leido: false },
      _count: { _all: true },
    }),
  ])
  const userMap = new Map(usuarios.map(u => [u.id, u]))
  const noLeidosMap = new Map(noLeidos.map(n => [n.remitenteId, n._count._all]))

  return ultimos
    .filter(u => userMap.has(u.otro))
    .sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
    .map(u => ({
      usuario: userMap.get(u.otro)!,
      ultimoMensaje: {
        id: u.id,
        contenido: u.contenido,
        creadoEn: new Date(u.creadoEn).toISOString(),
        esMio: u.remitenteId === userId,
      },
      noLeidos: noLeidosMap.get(u.otro) ?? 0,
    }))
}

export type Conversacion = Awaited<ReturnType<typeof getConversaciones>>[number]

export async function contarNoLeidos(userId: string) {
  return prisma.mensajeDirecto.count({ where: { destinatarioId: userId, leido: false } })
}
