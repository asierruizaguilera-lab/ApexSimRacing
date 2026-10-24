import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z, disciplina, urlSegura, numeroFlexible } from '@/lib/validacion'

const Clase = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(200),
  descripcion: z.string().max(5000).nullable().optional(),
  disciplina,
  youtubeUrl: urlSegura.nullable().optional(),
  linkPresentacion: urlSegura.nullable().optional(),
  duracionMin: numeroFlexible.nullable().optional(),
  orden: numeroFlexible.nullable().optional(),
  publicada: z.boolean().optional(),
})

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

  const v = await validarBody(req, Clase)
  if (!v.ok) return v.res
  const body = v.data
  const { titulo, descripcion, disciplina, youtubeUrl, linkPresentacion, duracionMin, orden, publicada } = body

  if (!titulo || !disciplina) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  const clase = await prisma.clase.create({
    data: {
      titulo,
      descripcion: descripcion || null,
      disciplina,
      youtubeUrl: youtubeUrl || null,
      linkPresentacion: linkPresentacion || null,
      duracionMin: duracionMin ? Number(duracionMin) : null,
      orden: orden ? Number(orden) : 0,
      publicada: Boolean(publicada),
    },
  })

  return NextResponse.json(clase, { status: 201 })
}
