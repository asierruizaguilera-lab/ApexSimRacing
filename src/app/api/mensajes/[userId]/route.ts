import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bloqueoSpamDMHasta } from '@/lib/chatSpam'
import { MAX_LONGITUD_MENSAJE, canalDM, emitir } from '@/lib/equipos'

export const dynamic = 'force-dynamic'

const HISTORIAL_MAX = 1000

// Historial de la conversación con [userId]
export async function GET(_: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const yo = session.user.id

  const otro = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, username: true, avatar: true, role: true },
  })
  if (!otro) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const mensajes = await prisma.mensajeDirecto.findMany({
    where: {
      OR: [
        { remitenteId: yo, destinatarioId: otro.id },
        { remitenteId: otro.id, destinatarioId: yo },
      ],
    },
    orderBy: { creadoEn: 'desc' },
    take: HISTORIAL_MAX,
  })
  return NextResponse.json({ usuario: otro, mensajes: mensajes.reverse() })
}

// Enviar mensaje directo: se guarda, se difunde al canal privado y se avisa al destinatario.
// Va por API (no por socket) para aplicar silenciado y anti-spam, igual que el chat general.
export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const yo = session.user.id

  if (params.userId === yo) return NextResponse.json({ error: 'No puedes enviarte mensajes a ti mismo' }, { status: 400 })

  const [destinatario, remitente] = await Promise.all([
    prisma.user.findUnique({ where: { id: params.userId }, select: { id: true, baneado: true } }),
    prisma.user.findUnique({ where: { id: yo }, select: { silenciado: true } }),
  ])
  if (!destinatario || destinatario.baneado) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (remitente?.silenciado) return NextResponse.json({ error: 'Tu cuenta está silenciada' }, { status: 403 })

  const { contenido } = await req.json()
  const texto = typeof contenido === 'string' ? contenido.trim() : ''
  if (!texto) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  if (texto.length > MAX_LONGITUD_MENSAJE) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin) {
    const hasta = await bloqueoSpamDMHasta(yo)
    if (hasta) {
      return NextResponse.json(
        { error: 'Has enviado demasiados mensajes seguidos. Espera antes de volver a escribir.', bloqueadoHasta: hasta.toISOString() },
        { status: 429 }
      )
    }
  }

  const mensaje = await prisma.mensajeDirecto.create({
    data: { remitenteId: yo, destinatarioId: destinatario.id, contenido: texto },
  })

  const canal = canalDM(yo, destinatario.id)
  emitir(canal, 'dm:message', mensaje)
  // Sala personal del destinatario: actualiza su badge y su bandeja aunque no tenga la conversación abierta
  emitir(`user:${destinatario.id}`, 'dm:notify', { mensaje, remitente: { id: yo, username: session.user.username } })

  // Notificación en la campana solo si no tiene la conversación abierta y no hay ya una sin leer de este remitente
  try {
    const io = (global as any).io
    const sockets = io ? await io.in(canal).fetchSockets() : []
    const estaEnConversacion = sockets.some((s: any) => s.data?.userId === destinatario.id)
    if (!estaEnConversacion) {
      const link = `/mensajes/${yo}`
      const pendiente = await prisma.notificacion.findFirst({
        where: { userId: destinatario.id, tipo: 'MENSAJE_DIRECTO', leida: false, link },
      })
      if (!pendiente) {
        await prisma.notificacion.create({
          data: { userId: destinatario.id, tipo: 'MENSAJE_DIRECTO', mensaje: `${session.user.username} te ha enviado un mensaje`, link },
        })
      }
    }
  } catch {}

  const bloqueadoHasta = isAdmin ? null : await bloqueoSpamDMHasta(yo)
  return NextResponse.json({ mensaje, bloqueadoHasta: bloqueadoHasta?.toISOString() ?? null }, { status: 201 })
}
