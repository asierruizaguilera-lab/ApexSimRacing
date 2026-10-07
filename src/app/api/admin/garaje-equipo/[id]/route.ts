import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { urlOpcional } from '@/lib/equipos'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim()
    if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    data.nombre = nombre
  }
  if (body.descripcion !== undefined) data.descripcion = String(body.descripcion ?? '').trim() || null
  for (const campo of ['imagenBase', 'linkDescarga'] as const) {
    if (body[campo] === undefined) continue
    const u = urlOpcional(body[campo])
    if (!u.ok) return NextResponse.json({ error: 'Las URLs deben empezar por http:// o https://' }, { status: 400 })
    data[campo] = u.valor
  }
  if (body.activo !== undefined) data.activo = !!body.activo

  const coche = await prisma.cocheEquipo.update({ where: { id: params.id }, data })
  return NextResponse.json(coche)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Si ya se usó en alguna temporada se desactiva en vez de borrarse, para no perder el histórico del garaje
  const usos = await prisma.temporada.count({ where: { cocheEquipoId: params.id } })
  if (usos > 0) {
    await prisma.cocheEquipo.update({ where: { id: params.id }, data: { activo: false } })
    return NextResponse.json({ ok: true, desactivado: true })
  }
  await prisma.cocheEquipo.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true, desactivado: false })
}
