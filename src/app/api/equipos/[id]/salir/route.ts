import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { disolverEquipo, emitir } from '@/lib/equipos'

// Salir del equipo. El líder solo puede salir si es el único miembro (y entonces el equipo se disuelve);
// si hay más pilotos, primero debe transferir el liderazgo.
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const userId = session.user.id

  const miembro = await prisma.miembroEquipo.findUnique({
    where: { userId },
    include: { equipo: { include: { _count: { select: { miembros: true } } } } },
  })
  if (!miembro || miembro.equipoId !== params.id) return NextResponse.json({ error: 'No eres miembro de este equipo' }, { status: 404 })

  const { equipo } = miembro
  if (equipo.liderId === userId) {
    if (equipo._count.miembros > 1) {
      return NextResponse.json({ error: 'Transfiere el liderazgo a otro piloto antes de salir del equipo' }, { status: 400 })
    }
    await disolverEquipo(equipo.id)
    return NextResponse.json({ ok: true, disuelto: true })
  }

  await prisma.miembroEquipo.delete({ where: { userId } })
  await prisma.notificacion.create({
    data: { userId: equipo.liderId, tipo: 'EQUIPO', mensaje: `${session.user.username} ha salido de ${equipo.nombre}`, link: `/equipos/${equipo.id}` },
  })
  emitir(`equipo:${equipo.id}`, 'equipo:actualizado', { id: equipo.id })
  return NextResponse.json({ ok: true, disuelto: false })
}
