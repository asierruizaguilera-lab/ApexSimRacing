import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const queja = await prisma.queja.findUnique({
    where: { id: params.id },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: {
        select: { id: true, nombre: true, circuito: true, fecha: true, campeonato: { select: { id: true, nombre: true } } },
      },
      pruebas: {
        orderBy: { creadoEn: 'asc' },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  })
  if (!queja) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const esParte = queja.denuncianteId === session.user.id || queja.denunciadoId === session.user.id
  if (!esParte && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  return NextResponse.json(queja)
}
