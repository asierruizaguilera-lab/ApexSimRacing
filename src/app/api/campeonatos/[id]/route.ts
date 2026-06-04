import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const camp = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: {
      carreras: { orderBy: { fecha: 'asc' } },
      inscripciones: { include: { user: { select: { id: true, username: true, avatar: true, pais: true } } } },
      sistemaPuntos: { orderBy: { posicion: 'asc' } },
    },
  })
  if (!camp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(camp)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { nombre, disciplina, simulador, descripcion, estado, fechaInicio, fechaFin, maxPilotos, modsReq } = body

  const camp = await prisma.campeonato.update({
    where: { id: params.id },
    data: {
      nombre, disciplina, simulador, descripcion, estado,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      maxPilotos: parseInt(maxPilotos) || 20,
      modsReq,
    },
  })
  return NextResponse.json(camp)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.campeonato.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
