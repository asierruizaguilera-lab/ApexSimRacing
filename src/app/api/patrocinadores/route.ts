import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { UbicacionPatrocinador } from '@prisma/client'
import { validarQuery, z } from '@/lib/validacion'

const Consulta = z.object({
  ubicacion: z.nativeEnum(UbicacionPatrocinador).optional(),
  public: z.string().max(5).optional(),
})

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { ubicacion } = q.data
  const isPublic = q.data.public === '1'

  // Landing es pública; el resto requiere sesión
  if (!isPublic && ubicacion !== 'LANDING') {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const where: Prisma.PatrocinadorWhereInput = { activo: true }
  if (ubicacion) {
    where.ubicaciones = { hasSome: [ubicacion, 'TODAS'] }
  }

  const patrocinadores = await prisma.patrocinador.findMany({
    where,
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
  })

  return NextResponse.json(patrocinadores)
}
