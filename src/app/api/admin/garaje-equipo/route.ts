import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { urlOpcional } from '@/lib/equipos'

export const dynamic = 'force-dynamic'

// Coches de equipo con sus skins y temporadas asignadas
export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const coches = await prisma.cocheEquipo.findMany({
    orderBy: { creadoEn: 'desc' },
    include: {
      temporadas: { select: { id: true, numero: true, anio: true, activa: true } },
      skins: { include: { equipo: { select: { id: true, nombre: true, colorPrimario: true } } } },
    },
  })
  return NextResponse.json(coches)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const imagenBase = urlOpcional(body.imagenBase)
  const linkDescarga = urlOpcional(body.linkDescarga)
  if (!imagenBase.ok || !linkDescarga.ok) {
    return NextResponse.json({ error: 'Las URLs deben empezar por http:// o https://' }, { status: 400 })
  }

  const coche = await prisma.cocheEquipo.create({
    data: {
      nombre,
      descripcion: typeof body.descripcion === 'string' ? body.descripcion.trim() || null : null,
      imagenBase: imagenBase.valor,
      linkDescarga: linkDescarga.valor,
    },
  })
  return NextResponse.json(coche, { status: 201 })
}
