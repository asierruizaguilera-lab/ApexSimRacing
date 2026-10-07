import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { colorValido, urlOpcional, emitir } from '@/lib/equipos'
import { getEquipoDetalle } from '@/lib/equipoDetalle'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const equipo = await getEquipoDetalle(params.id)
  if (!equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  return NextResponse.json(equipo)
}

// Editar equipo (solo líder): datos básicos y/o transferir el liderazgo a otro miembro
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const equipo = await prisma.equipo.findUnique({ where: { id: params.id } })
  if (!equipo || !equipo.activo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (equipo.liderId !== session.user.id) return NextResponse.json({ error: 'Solo el líder puede editar el equipo' }, { status: 403 })

  const body = await req.json()
  const data: { nombre?: string; descripcion?: string | null; colorPrimario?: string; logoUrl?: string | null } = {}

  if (body.nombre !== undefined) {
    const nombre = String(body.nombre).trim()
    if (nombre.length < 3 || nombre.length > 40) return NextResponse.json({ error: 'El nombre debe tener entre 3 y 40 caracteres' }, { status: 400 })
    if (nombre.toLowerCase() !== equipo.nombre.toLowerCase()) {
      const usado = await prisma.equipo.findFirst({ where: { nombre: { equals: nombre, mode: 'insensitive' }, id: { not: equipo.id } } })
      if (usado) return NextResponse.json({ error: 'Ya existe un equipo con ese nombre' }, { status: 409 })
    }
    data.nombre = nombre
  }
  if (body.descripcion !== undefined) data.descripcion = String(body.descripcion ?? '').trim().slice(0, 500) || null
  if (body.colorPrimario !== undefined) {
    if (!colorValido(body.colorPrimario)) return NextResponse.json({ error: 'Color inválido (formato #RRGGBB)' }, { status: 400 })
    data.colorPrimario = body.colorPrimario
  }
  if (body.logoUrl !== undefined) {
    const logo = urlOpcional(body.logoUrl)
    if (!logo.ok) return NextResponse.json({ error: 'El logo debe ser una URL http(s)' }, { status: 400 })
    data.logoUrl = logo.valor
  }

  // Transferir liderazgo
  if (body.nuevoLiderId && body.nuevoLiderId !== equipo.liderId) {
    const nuevo = await prisma.miembroEquipo.findUnique({ where: { userId: body.nuevoLiderId } })
    if (!nuevo || nuevo.equipoId !== equipo.id) return NextResponse.json({ error: 'El nuevo líder debe ser miembro del equipo' }, { status: 400 })
    await prisma.$transaction([
      prisma.miembroEquipo.update({ where: { userId: equipo.liderId }, data: { rol: 'PILOTO' } }),
      prisma.miembroEquipo.update({ where: { userId: body.nuevoLiderId }, data: { rol: 'LIDER' } }),
      prisma.equipo.update({ where: { id: equipo.id }, data: { liderId: body.nuevoLiderId } }),
    ])
    await prisma.notificacion.create({
      data: { userId: body.nuevoLiderId, tipo: 'EQUIPO', mensaje: `Ahora eres el líder de ${equipo.nombre}`, link: `/equipos/${equipo.id}` },
    })
  }

  const actualizado = Object.keys(data).length > 0
    ? await prisma.equipo.update({ where: { id: equipo.id }, data })
    : await prisma.equipo.findUniqueOrThrow({ where: { id: equipo.id } })

  emitir(`equipo:${equipo.id}`, 'equipo:actualizado', { id: equipo.id })
  return NextResponse.json(actualizado)
}
