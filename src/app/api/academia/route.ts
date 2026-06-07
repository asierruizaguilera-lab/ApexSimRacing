import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getThumbnailUrl } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const disciplina = searchParams.get('disciplina')

  const clases = await prisma.clase.findMany({
    where: {
      publicada: true,
      ...(disciplina ? { disciplina: disciplina as any } : {}),
    },
    orderBy: [{ disciplina: 'asc' }, { orden: 'asc' }, { creadoEn: 'asc' }],
    include: {
      _count: { select: { vistas: true } },
      vistas: { where: { userId: session.user.id }, select: { id: true } },
    },
  })

  return NextResponse.json(clases.map(c => ({
    id: c.id,
    titulo: c.titulo,
    descripcion: c.descripcion,
    disciplina: c.disciplina,
    thumbnailUrl: getThumbnailUrl(c.youtubeUrl),
    duracionMin: c.duracionMin,
    orden: c.orden,
    totalVistas: c._count.vistas,
    vistaPorMi: c.vistas.length > 0,
  })))
}
