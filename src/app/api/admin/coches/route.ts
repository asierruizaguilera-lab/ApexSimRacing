import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const coches = await prisma.coche.findMany({
    orderBy: [{ planMinimo: 'asc' }, { disciplina: 'asc' }],
    include: { _count: { select: { desbloqueos: true } } },
  })
  return NextResponse.json(coches)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, disciplina, planMinimo, descripcion, imagen, modAC } = await req.json()
  if (!nombre || !disciplina || !planMinimo) {
    return NextResponse.json({ error: 'Nombre, disciplina y plan son requeridos' }, { status: 400 })
  }

  const coche = await prisma.coche.create({
    data: { nombre, disciplina, planMinimo, descripcion, imagen, modAC, activo: true },
  })
  return NextResponse.json(coche, { status: 201 })
}
