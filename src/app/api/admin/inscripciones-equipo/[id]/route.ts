import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Confirmar o cancelar la inscripción de un equipo en un campeonato de equipos
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { estado } = await req.json()
  if (!['CONFIRMADA', 'CANCELADA'].includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const inscripcion = await prisma.inscripcionEquipo.update({
    where: { id: params.id },
    data: { estado },
    include: {
      equipo: { select: { nombre: true, miembros: { select: { userId: true } } } },
      campeonato: { select: { id: true, nombre: true } },
    },
  })

  const mensaje = estado === 'CONFIRMADA'
    ? `La inscripción de ${inscripcion.equipo.nombre} en ${inscripcion.campeonato.nombre} ha sido confirmada. ¡A competir!`
    : `La inscripción de ${inscripcion.equipo.nombre} en ${inscripcion.campeonato.nombre} ha sido cancelada.`
  await prisma.notificacion.createMany({
    data: inscripcion.equipo.miembros.map(m => ({
      userId: m.userId, tipo: 'INSCRIPCION_CONFIRMADA' as const, mensaje, link: `/campeonatos/${inscripcion.campeonato.id}`,
    })),
  })

  return NextResponse.json(inscripcion)
}
