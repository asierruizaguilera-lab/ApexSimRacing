import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const pilotos = await prisma.user.findMany({
    where: { role: 'PILOTO' },
    orderBy: { totalPuntos: 'desc' },
    select: {
      id: true, username: true, avatar: true, pais: true,
      totalPuntos: true, totalCarreras: true, totalVictorias: true, totalPodios: true,
    },
  })
  return NextResponse.json(pilotos)
}
