import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { whereActividad, nombresUsuarios, kpisActividad24h } from '@/lib/actividadAdmin'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 50

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const params = req.nextUrl.searchParams
  const pagina = Math.max(1, parseInt(params.get('pagina') || '1', 10) || 1)
  const where = await whereActividad(params)

  const [items, total, kpis] = await Promise.all([
    prisma.logActividad.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.logActividad.count({ where }),
    kpisActividad24h(),
  ])
  const nombres = await nombresUsuarios(items.map(i => i.userId))

  return NextResponse.json({
    items: items.map(i => ({ ...i, username: i.userId ? nombres.get(i.userId) ?? null : null })),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    kpis,
  })
}
