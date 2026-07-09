import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const queja = await prisma.queja.findUnique({
    where: { id: params.id },
    select: { denuncianteId: true, denunciadoId: true, estado: true },
  })
  if (!queja) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const esParte = queja.denuncianteId === session.user.id || queja.denunciadoId === session.user.id
  if (!esParte && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  if (queja.estado === 'RESUELTA' || queja.estado === 'ARCHIVADA') {
    return NextResponse.json({ error: 'Esta incidencia ya está cerrada' }, { status: 400 })
  }

  const { descripcion, linkPrueba } = await req.json()
  if (!descripcion?.trim()) {
    return NextResponse.json({ error: 'La descripción de la prueba es requerida' }, { status: 400 })
  }

  const prueba = await prisma.pruebaQueja.create({
    data: {
      quejaId: params.id,
      userId: session.user.id,
      descripcion: descripcion.trim(),
      linkPrueba: linkPrueba || null,
    },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json(prueba, { status: 201 })
}
