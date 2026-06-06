import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const suscripciones = await prisma.suscripcion.findMany({
    orderBy: { fechaInicio: 'desc' },
    include: {
      user: { select: { id: true, username: true, email: true, pais: true, avatar: true } },
    },
  })

  // Stats por plan
  const stats = await prisma.suscripcion.groupBy({
    by: ['plan', 'estado'],
    _count: { id: true },
    where: { estado: 'ACTIVA' },
  })

  return NextResponse.json({ suscripciones, stats })
}
