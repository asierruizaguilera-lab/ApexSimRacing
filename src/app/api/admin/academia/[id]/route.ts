import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z, disciplina, urlSegura, numeroFlexible } from '@/lib/validacion'

const ClaseParcial = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(200),
  descripcion: z.string().max(5000).nullable().optional(),
  disciplina,
  youtubeUrl: urlSegura.nullable().optional(),
  linkPresentacion: urlSegura.nullable().optional(),
  duracionMin: numeroFlexible.nullable().optional(),
  orden: numeroFlexible.nullable().optional(),
  publicada: z.boolean().optional(),
}).partial()

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, ClaseParcial)
  if (!v.ok) return v.res
  const body = v.data
  const { titulo, descripcion, disciplina, youtubeUrl, linkPresentacion, duracionMin, orden, publicada } = body

  const clase = await prisma.clase.update({
    where: { id: params.id },
    data: {
      ...(titulo !== undefined && { titulo }),
      ...(descripcion !== undefined && { descripcion: descripcion || null }),
      ...(disciplina !== undefined && { disciplina }),
      ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
      ...(linkPresentacion !== undefined && { linkPresentacion: linkPresentacion || null }),
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
