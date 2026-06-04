import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailInscripcionConfirmada } from '@/lib/email'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { estado } = await req.json()
  if (!['CONFIRMADA', 'CANCELADA'].includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const inscripcion = await prisma.inscripcion.update({
    where: { id: params.id },
    data: { estado },
    include: {
      user: { select: { id: true, username: true, email: true } },
      campeonato: { select: { nombre: true, id: true } },
    },
  })

  if (estado === 'CONFIRMADA') {
    await prisma.notificacion.create({
      data: {
        userId: inscripcion.userId,
        tipo: 'INSCRIPCION_CONFIRMADA',
        mensaje: `Tu inscripción a ${inscripcion.campeonato.nombre} ha sido confirmada. ¡Prepárate para competir!`,
        link: `/campeonatos/${inscripcion.campeonato.id}`,
      },
    })

    sendEmail({
      to: inscripcion.user.email,
      subject: `Inscripción confirmada: ${inscripcion.campeonato.nombre}`,
      html: emailInscripcionConfirmada(inscripcion.user.username, inscripcion.campeonato.nombre),
    }).catch(() => null)
  }

  return NextResponse.json(inscripcion)
}
