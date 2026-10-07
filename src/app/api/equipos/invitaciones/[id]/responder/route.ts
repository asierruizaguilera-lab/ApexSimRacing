import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MAX_MIEMBROS_EQUIPO, emitir } from '@/lib/equipos'

// Aceptar o rechazar una invitación. Body: { aceptar: boolean }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const invitacion = await prisma.invitacionEquipo.findUnique({
    where: { id: params.id },
    include: { equipo: { include: { _count: { select: { miembros: true } } } } },
  })
  if (!invitacion || invitacion.invitadoId !== userId) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (invitacion.estado !== 'PENDIENTE') return NextResponse.json({ error: 'Esta invitación ya fue respondida' }, { status: 409 })

  const { aceptar } = await req.json()

  if (!aceptar) {
    await prisma.invitacionEquipo.update({ where: { id: invitacion.id }, data: { estado: 'RECHAZADA' } })
    return NextResponse.json({ ok: true, estado: 'RECHAZADA' })
  }

  const { equipo } = invitacion
  if (!equipo.activo) {
    await prisma.invitacionEquipo.update({ where: { id: invitacion.id }, data: { estado: 'RECHAZADA' } })
    return NextResponse.json({ error: 'Este equipo ya no existe' }, { status: 410 })
  }
  if (equipo._count.miembros >= MAX_MIEMBROS_EQUIPO) {
    return NextResponse.json({ error: `${equipo.nombre} ya está completo (${MAX_MIEMBROS_EQUIPO} pilotos)` }, { status: 400 })
  }

  try {
    await prisma.$transaction([
      prisma.miembroEquipo.create({ data: { equipoId: equipo.id, userId, rol: 'PILOTO' } }),
      prisma.invitacionEquipo.update({ where: { id: invitacion.id }, data: { estado: 'ACEPTADA' } }),
      // Solo se puede estar en un equipo: el resto de invitaciones pendientes quedan rechazadas
      prisma.invitacionEquipo.updateMany({
        where: { invitadoId: userId, estado: 'PENDIENTE', id: { not: invitacion.id } },
        data: { estado: 'RECHAZADA' },
      }),
    ])
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'Ya perteneces a un equipo' }, { status: 409 })
    throw e
  }

  await prisma.notificacion.create({
    data: { userId: equipo.liderId, tipo: 'EQUIPO', mensaje: `${session.user.username} se ha unido a ${equipo.nombre}`, link: `/equipos/${equipo.id}` },
  })
  emitir(`equipo:${equipo.id}`, 'equipo:actualizado', { id: equipo.id })

  return NextResponse.json({ ok: true, estado: 'ACEPTADA', equipoId: equipo.id })
}
