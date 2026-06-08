import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { UbicacionPatrocinador } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const ubicacion = searchParams.get('ubicacion') as UbicacionPatrocinador | null
  const isPublic = searchParams.get('public') === '1'

  // Landing es pública; el resto requiere sesión
  if (!isPublic && ubicacion !== 'LANDING') {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  const where: any = { activo: true }
  if (ubicacion) {
    where.ubicaciones = { hasSome: [ubicacion, 'TODAS'] }
  }

  const patrocinadores = await prisma.patrocinador.findMany({
    where,
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
  })

  return NextResponse.json(patrocinadores)
}
