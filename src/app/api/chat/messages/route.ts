import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bloqueoSpamHasta } from '@/lib/chatSpam'
import type { CanalChat } from '@prisma/client'
import { validarBody, validarQuery, z } from '@/lib/validacion'

const Mensaje = z.object({
  contenido: z.string().max(5000),
  canal: z.string().max(20).optional(),
})
const Consulta = z.object({
  canal: z.enum(['GENERAL', 'RALLY', 'CIRCUITO', 'ANUNCIOS']).default('GENERAL'),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

const CANALES = ['GENERAL', 'RALLY', 'CIRCUITO', 'ANUNCIOS']
const USER_SELECT = { id: true, username: true, avatar: true, role: true, esFounder: true, suscripcion: { select: { plan: true, estado: true } } }

export async function GET(req: NextRequest) {
  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { canal, limit } = q.data

  const mensajes = await prisma.mensajeChat.findMany({
    where: { canal, eliminado: false },
    orderBy: { creadoEn: 'desc' },
    take: limit,
    include: { user: { select: USER_SELECT } },
  })

  return NextResponse.json(mensajes.reverse())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const v = await validarBody(req, Mensaje)
  if (!v.ok) return v.res
  const { contenido, canal: canalBody } = v.data
  const canal = (canalBody && CANALES.includes(canalBody) ? canalBody : 'GENERAL') as CanalChat
  if (!contenido?.trim()) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  if (contenido.length > 500) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const isAdmin = session.user.role === 'ADMIN'

  // Solo admins pueden escribir en ANUNCIOS
  if (canal === 'ANUNCIOS' && !isAdmin) {
    return NextResponse.json({ error: 'Solo los administradores pueden escribir en anuncios' }, { status: 403 })
  }

  // Verificar si está silenciado
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { silenciado: true } })
  if (user?.silenciado) return NextResponse.json({ error: 'Tu cuenta está silenciada' }, { status: 403 })

  // Anti-spam (los admins están exentos)
  if (!isAdmin) {
    const hasta = await bloqueoSpamHasta(session.user.id)
    if (hasta) {
      return NextResponse.json(
        { error: 'Has enviado demasiados mensajes seguidos. Espera antes de volver a escribir.', bloqueadoHasta: hasta.toISOString() },
        { status: 429 }
      )
    }
  }

  const mensaje = await prisma.mensajeChat.create({
    data: { userId: session.user.id, canal, contenido: contenido.trim() },
    include: { user: { select: USER_SELECT } },
  })

  // Difusión en tiempo real desde el servidor (los clientes ya no pueden reenviar mensajes por socket)
  const io = (global as any).io
  if (io) io.to(canal).emit('chat:message', mensaje)

  // Si este mensaje completa la ráfaga, el bloqueo empieza ya: se lo decimos al cliente para mostrar el contador
  const bloqueadoHasta = isAdmin ? null : await bloqueoSpamHasta(session.user.id)

  return NextResponse.json({ mensaje, bloqueadoHasta: bloqueadoHasta?.toISOString() ?? null }, { status: 201 })
}
