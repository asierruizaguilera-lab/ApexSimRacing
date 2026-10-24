import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarQuery, z } from '@/lib/validacion'

const Consulta = z.object({ q: z.string().max(40).default('') })

export const dynamic = 'force-dynamic'

// Búsqueda de pilotos por username (nuevo mensaje directo, invitar a un equipo)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const consulta = validarQuery(req.nextUrl.searchParams, Consulta)
  if (!consulta.ok) return consulta.res
  const q = consulta.data.q.trim()
  if (q.length < 2) return NextResponse.json([])

  const usuarios = await prisma.user.findMany({
    where: { username: { contains: q, mode: 'insensitive' }, baneado: false, eliminadoEn: null, id: { not: session.user.id } },
    orderBy: { username: 'asc' },
    take: 8,
    select: {
      id: true, username: true, avatar: true, pais: true,
      miembroEquipo: { select: { equipo: { select: { id: true, nombre: true } } } },
    },
  })
  return NextResponse.json(usuarios.map(u => ({
    id: u.id, username: u.username, avatar: u.avatar, pais: u.pais,
    equipo: u.miembroEquipo?.equipo ?? null,
  })))
}
