import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitir } from '@/lib/equipos'

// Moderación: borrar un mensaje del chat de un equipo
export async function DELETE(_: NextRequest, { params }: { params: { id: string; mensajeId: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const mensaje = await prisma.mensajeEquipo.findUnique({ where: { id: params.mensajeId } })
  if (!mensaje || mensaje.equipoId !== params.id) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })

  await prisma.mensajeEquipo.delete({ where: { id: mensaje.id } })
  emitir(`equipo:${params.id}`, 'equipo:message-deleted', { id: mensaje.id })
  return NextResponse.json({ ok: true })
}
