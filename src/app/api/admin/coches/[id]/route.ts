import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, disciplina, planMinimo, descripcion, imagen, modAC, activo } = await req.json()

  const coche = await prisma.coche.update({
    where: { id: params.id },
    data: { nombre, disciplina, planMinimo, descripcion, imagen, modAC, activo },
  })
  return NextResponse.json(coche)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.coche.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
