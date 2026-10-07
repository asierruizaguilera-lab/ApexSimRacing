import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Propuestas de equipos. ?estado=PENDIENTE para solo las pendientes (badge de la sidebar)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const estado = req.nextUrl.searchParams.get('estado')
  const propuestas = await prisma.propuestaEquipo.findMany({
    where: estado === 'PENDIENTE' ? { estado: { in: ['PENDIENTE', 'REVISANDO'] } } : undefined,
    orderBy: { creadoEn: 'desc' },
    include: {
      equipo: { select: { id: true, nombre: true, colorPrimario: true } },
      lider: { select: { id: true, username: true } },
      temporada: { select: { numero: true, anio: true } },
    },
  })
  return NextResponse.json(propuestas)
}
