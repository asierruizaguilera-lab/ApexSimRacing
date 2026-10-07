import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Inscribir al equipo del usuario en un campeonato de equipos (solo el líder)
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const camp = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscripcionesEquipo: { where: { estado: { in: ['PENDIENTE', 'CONFIRMADA'] } } } } } },
  })
  if (!camp) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })
  if (!camp.esCampeonatoEquipos) return NextResponse.json({ error: 'Este campeonato es individual' }, { status: 400 })
  if (camp.estado === 'FINALIZADO') return NextResponse.json({ error: 'Este campeonato ya ha finalizado' }, { status: 400 })

  const equipo = await prisma.equipo.findFirst({ where: { liderId: session.user.id, activo: true } })
  if (!equipo) return NextResponse.json({ error: 'Solo los líderes de equipo pueden inscribir a su equipo', code: 'NO_LIDER' }, { status: 403 })

  // En campeonatos de equipos, maxPilotos indica el máximo de equipos
  if (camp._count.inscripcionesEquipo >= camp.maxPilotos) return NextResponse.json({ error: 'Campeonato lleno' }, { status: 400 })

  const existente = await prisma.inscripcionEquipo.findUnique({
    where: { campeonatoId_equipoId: { campeonatoId: camp.id, equipoId: equipo.id } },
  })
  if (existente && existente.estado !== 'CANCELADA') {
    return NextResponse.json({ error: 'Tu equipo ya está inscrito en este campeonato' }, { status: 409 })
  }

  const inscripcion = existente
    ? await prisma.inscripcionEquipo.update({ where: { id: existente.id }, data: { estado: 'PENDIENTE', fechaInscripcion: new Date() } })
    : await prisma.inscripcionEquipo.create({ data: { campeonatoId: camp.id, equipoId: equipo.id } })

  const miembros = await prisma.miembroEquipo.findMany({ where: { equipoId: equipo.id }, select: { userId: true } })
  await prisma.notificacion.createMany({
    data: miembros.map(m => ({
      userId: m.userId,
      tipo: 'INSCRIPCION_CONFIRMADA' as const,
      mensaje: `${equipo.nombre} se ha inscrito en ${camp.nombre}. Pendiente de confirmación.`,
      link: `/campeonatos/${camp.id}`,
    })),
  })

  return NextResponse.json(inscripcion, { status: 201 })
}
