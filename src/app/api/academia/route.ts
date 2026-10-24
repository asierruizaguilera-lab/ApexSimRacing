import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getThumbnailUrl } from '@/lib/youtube'
import { validarQuery, z, disciplina } from '@/lib/validacion'

const Consulta = z.object({ disciplina: disciplina.optional() })

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { disciplina } = q.data

  const clases = await prisma.clase.findMany({
    where: {
      publicada: true,
      ...(disciplina ? { disciplina } : {}),
    },
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
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
    numeroModulo: c.numeroModulo,
    thumbnailUrl: c.youtubeUrl ? getThumbnailUrl(c.youtubeUrl) : null,
    duracionMin: c.duracionMin,
    duracionTexto: c.duracionTexto,
    numeroTecnicas: c.numeroTecnicas,
    tieneVideo: Boolean(c.youtubeUrl),
    linkPresentacion: c.linkPresentacion,
    orden: c.orden,
    totalVistas: c._count.vistas,
    vistaPorMi: c.vistas.length > 0,
  })))
}
