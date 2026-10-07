import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { disolverEquipo, emitir } from '@/lib/equipos'

// Moderación de equipos. Body: { accion: 'DISOLVER' } | { accion: 'CAMBIAR_LIDER', nuevoLiderId }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const equipo = await prisma.equipo.findUnique({ where: { id: params.id } })
  if (!equipo) return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
  if (!equipo.activo) return NextResponse.json({ error: 'El equipo ya está disuelto' }, { status: 400 })

  const { accion, nuevoLiderId } = await req.json()

  if (accion === 'DISOLVER') {
    await disolverEquipo(equipo.id)
    await prisma.logAccionAdmin.create({
      data: { adminId: session.user.id, targetUserId: equipo.liderId, accion: 'DISOLVER_EQUIPO', detalle: equipo.nombre },
    })
    return NextResponse.json({ ok: true })
  }

  if (accion === 'CAMBIAR_LIDER') {
    const nuevo = await prisma.miembroEquipo.findUnique({ where: { userId: String(nuevoLiderId ?? '') } })
    if (!nuevo || nuevo.equipoId !== equipo.id) return NextResponse.json({ error: 'El nuevo líder debe ser miembro del equipo' }, { status: 400 })
    if (nuevo.userId === equipo.liderId) return NextResponse.json({ error: 'Ya es el líder' }, { status: 400 })

    await prisma.$transaction([
      prisma.miembroEquipo.updateMany({ where: { equipoId: equipo.id, rol: 'LIDER' }, data: { rol: 'PILOTO' } }),
      prisma.miembroEquipo.update({ where: { userId: nuevo.userId }, data: { rol: 'LIDER' } }),
      prisma.equipo.update({ where: { id: equipo.id }, data: { liderId: nuevo.userId } }),
    ])
    await prisma.notificacion.create({
      data: { userId: nuevo.userId, tipo: 'EQUIPO', mensaje: `Un administrador te ha nombrado líder de ${equipo.nombre}`, link: `/equipos/${equipo.id}` },
    })
    await prisma.logAccionAdmin.create({
      data: { adminId: session.user.id, targetUserId: nuevo.userId, accion: 'CAMBIAR_LIDER_EQUIPO', detalle: equipo.nombre },
    })
    emitir(`equipo:${equipo.id}`, 'equipo:actualizado', { id: equipo.id })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
