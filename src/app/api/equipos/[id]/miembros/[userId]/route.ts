import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitir } from '@/lib/equipos'

// Expulsar a un piloto (solo líder)
export async function DELETE(_: NextRequest, { params }: { params: { id: string; userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const equipo = await prisma.equipo.findUnique({ where: { id: params.id } })
  if (!equipo || !equipo.activo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (equipo.liderId !== session.user.id) return NextResponse.json({ error: 'Solo el líder puede expulsar pilotos' }, { status: 403 })
  if (params.userId === equipo.liderId) return NextResponse.json({ error: 'El líder no puede expulsarse a sí mismo' }, { status: 400 })

  const miembro = await prisma.miembroEquipo.findUnique({ where: { userId: params.userId } })
  if (!miembro || miembro.equipoId !== equipo.id) return NextResponse.json({ error: 'Ese piloto no es miembro del equipo' }, { status: 404 })

  await prisma.miembroEquipo.delete({ where: { userId: params.userId } })
  await prisma.notificacion.create({
    data: { userId: params.userId, tipo: 'EQUIPO', mensaje: `Ya no formas parte de ${equipo.nombre}`, link: '/equipos' },
  })
  emitir(`equipo:${equipo.id}`, 'equipo:actualizado', { id: equipo.id })
  return NextResponse.json({ ok: true })
}
