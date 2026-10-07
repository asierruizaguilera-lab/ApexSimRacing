import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Todas las temporadas (más recientes primero) con coche y ganador
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const temporadas = await prisma.temporada.findMany({
    orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
    include: {
      cocheEquipo: { select: { id: true, nombre: true, imagenBase: true } },
      equipoGanador: { select: { id: true, nombre: true, colorPrimario: true, logoUrl: true } },
    },
  })
  return NextResponse.json(temporadas)
}
