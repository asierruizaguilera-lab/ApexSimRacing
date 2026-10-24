import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarQuery, z } from '@/lib/validacion'

const Consulta = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) })

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json([], { status: 401 })

  const q = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!q.ok) return q.res
  const { limit } = q.data

  const notifs = await prisma.notificacion.findMany({
    where: { userId: session.user.id },
    orderBy: { creadoEn: 'desc' },
    take: limit,
  })

  return NextResponse.json(notifs)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await prisma.notificacion.updateMany({
    where: { userId: session.user.id, leida: false },
    data: { leida: true },
  })

  return NextResponse.json({ ok: true })
}
