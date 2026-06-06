import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailInscripcionConfirmada } from '@/lib/email'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const camp = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscripciones: { where: { estado: { in: ['PENDIENTE', 'CONFIRMADA'] } } } } } },
  })

  if (!camp) return NextResponse.json({ error: 'Campeonato no encontrado' }, { status: 404 })

  // Verificar suscripción activa
  const suscripcion = await prisma.suscripcion.findFirst({
    where: { userId: session.user.id, estado: 'ACTIVA' },
  })
  if (!suscripcion) {
    return NextResponse.json({
      error: 'Necesitas un plan activo para inscribirte en campeonatos',
      code: 'NO_SUBSCRIPTION',
      redirectTo: '/planes',
    }, { status: 403 })
  }
  if (camp.estado === 'FINALIZADO') return NextResponse.json({ error: 'Este campeonato ya ha finalizado' }, { status: 400 })
  if (camp._count.inscripciones >= camp.maxPilotos) return NextResponse.json({ error: 'Campeonato lleno' }, { status: 400 })

  const existing = await prisma.inscripcion.findUnique({
    where: { userId_campeonatoId: { userId: session.user.id, campeonatoId: params.id } },
  })

  if (existing) {
    if (existing.estado === 'CANCELADA') {
      const updated = await prisma.inscripcion.update({
        where: { id: existing.id },
        data: { estado: 'PENDIENTE', fechaInscripcion: new Date() },
      })
      return NextResponse.json(updated)
    }
    return NextResponse.json({ error: 'Ya estás inscrito en este campeonato' }, { status: 409 })
  }

  const inscripcion = await prisma.inscripcion.create({
    data: { userId: session.user.id, campeonatoId: params.id, estado: 'PENDIENTE' },
  })

  // Notificación
  await prisma.notificacion.create({
    data: {
      userId: session.user.id,
      tipo: 'INSCRIPCION_CONFIRMADA',
      mensaje: `Tu solicitud de inscripción a ${camp.nombre} ha sido recibida. Pendiente de confirmación.`,
      link: `/campeonatos/${params.id}`,
    },
  })

  return NextResponse.json(inscripcion, { status: 201 })
}
