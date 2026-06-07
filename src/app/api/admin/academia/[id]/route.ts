import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { titulo, descripcion, disciplina, youtubeUrl, duracionMin, orden, publicada } = body

  const clase = await prisma.clase.update({
    where: { id: params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
      ...(disciplina !== undefined && { disciplina }),
      ...(youtubeUrl !== undefined && { youtubeUrl }),
      ...(duracionMin !== undefined && { duracionMin: duracionMin ? Number(duracionMin) : null }),
      ...(orden !== undefined && { orden: Number(orden) }),
      ...(publicada !== undefined && { publicada: Boolean(publicada) }),
    },
  })

  return NextResponse.json(clase)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.clase.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
