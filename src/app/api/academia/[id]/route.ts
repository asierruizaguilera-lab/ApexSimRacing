import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEmbedUrl, getThumbnailUrl } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clase = await prisma.clase.findUnique({
    where: { id: params.id, publicada: true },
    include: { _count: { select: { vistas: true } } },
  })
  if (!clase) return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 })

  return NextResponse.json({
    id: clase.id,
    titulo: clase.titulo,
    descripcion: clase.descripcion,
    disciplina: clase.disciplina,
    numeroModulo: clase.numeroModulo,
    embedUrl: clase.youtubeUrl ? getEmbedUrl(clase.youtubeUrl) : null,
    thumbnailUrl: clase.youtubeUrl ? getThumbnailUrl(clase.youtubeUrl) : null,
    duracionTexto: clase.duracionTexto,
    numeroTecnicas: clase.numeroTecnicas,
    duracionMin: clase.duracionMin,
    totalVistas: clase._count.vistas,
  })
}
