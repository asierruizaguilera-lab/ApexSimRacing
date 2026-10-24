import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarQuery, z } from '@/lib/validacion'

const Consulta = z.object({ estado: z.enum(['ABIERTA', 'EN_REVISION', 'RESUELTA', 'ARCHIVADA']).optional() })

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { estado } = q.data

  const quejas = await prisma.queja.findMany({
    where: estado ? { estado } : undefined,
    orderBy: { creadoEn: 'desc' },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: { select: { id: true, nombre: true, campeonato: { select: { id: true, nombre: true } } } },
      pruebas: {
        orderBy: { creadoEn: 'asc' },
        include: { user: { select: { id: true, username: true } } },
      },
    },
  })

  return NextResponse.json(quejas)
}
