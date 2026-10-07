import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bloqueoSpamEquipoHasta } from '@/lib/chatSpam'
import { MAX_LONGITUD_MENSAJE, USER_MINI_SELECT, emitir } from '@/lib/equipos'

async function puedeVer(userId: string, role: string, equipoId: string) {
  if (role === 'ADMIN') return true // moderación
  const m = await prisma.miembroEquipo.findUnique({ where: { userId }, select: { equipoId: true } })
  return m?.equipoId === equipoId
}

// Últimos 100 mensajes del equipo (miembros y admins)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!(await puedeVer(session.user.id, session.user.role, params.id))) {
    return NextResponse.json({ error: 'Solo los miembros del equipo pueden ver este chat' }, { status: 403 })
  }

  const mensajes = await prisma.mensajeEquipo.findMany({
    where: { equipoId: params.id },
    orderBy: { creadoEn: 'desc' },
    take: 100,
    include: { user: { select: USER_MINI_SELECT } },
  })
  return NextResponse.json(mensajes.reverse())
}

// Enviar mensaje (solo miembros). Se difunde por Socket.io en la sala equipo:[id]
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const miembro = await prisma.miembroEquipo.findUnique({ where: { userId }, select: { equipoId: true } })
  if (miembro?.equipoId !== params.id) return NextResponse.json({ error: 'Solo los miembros pueden escribir en este chat' }, { status: 403 })

  const { contenido } = await req.json()
  const texto = typeof contenido === 'string' ? contenido.trim() : ''
  if (!texto) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  if (texto.length > MAX_LONGITUD_MENSAJE) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { silenciado: true } })
  if (user?.silenciado) return NextResponse.json({ error: 'Tu cuenta está silenciada' }, { status: 403 })

  const hasta = await bloqueoSpamEquipoHasta(userId)
  if (hasta) {
    return NextResponse.json(
      { error: 'Has enviado demasiados mensajes seguidos. Espera antes de volver a escribir.', bloqueadoHasta: hasta.toISOString() },
      { status: 429 }
    )
  }

  const mensaje = await prisma.mensajeEquipo.create({
    data: { equipoId: params.id, userId, contenido: texto },
    include: { user: { select: USER_MINI_SELECT } },
  })
  emitir(`equipo:${params.id}`, 'equipo:message', mensaje)

  const bloqueadoHasta = await bloqueoSpamEquipoHasta(userId)
  return NextResponse.json({ mensaje, bloqueadoHasta: bloqueadoHasta?.toISOString() ?? null }, { status: 201 })
}
