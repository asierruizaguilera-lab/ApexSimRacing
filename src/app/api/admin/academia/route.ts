import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const clases = await prisma.clase.findMany({
    orderBy: [{ disciplina: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
    include: { _count: { select: { vistas: true } } },
  })

  return NextResponse.json(clases)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { titulo, descripcion, disciplina, youtubeUrl, duracionMin, orden, publicada } = body

  if (!titulo || !disciplina || !youtubeUrl) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const clase = await prisma.clase.create({
    data: {
      titulo,
      descripcion: descripcion || null,
      disciplina,
      youtubeUrl,
      duracionMin: duracionMin ? Number(duracionMin) : null,
      orden: orden ? Number(orden) : 0,
      publicada: Boolean(publicada),
    },
  })

  return NextResponse.json(clase, { status: 201 })
}
