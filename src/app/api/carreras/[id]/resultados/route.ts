import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const resultados = await prisma.resultado.findMany({
    where: { carreraId: params.id },
    orderBy: { posicion: 'asc' },
    include: {
      user: { select: { id: true, username: true, avatar: true, pais: true } },
    },
  })

  return NextResponse.json(resultados)
}
