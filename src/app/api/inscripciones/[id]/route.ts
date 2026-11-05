import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailInscripcionConfirmada } from '@/lib/email'
import { enviarConfirmacion } from '@/lib/mail/confirmaciones'
import { validarBody, z } from '@/lib/validacion'

const Esquema = z.object({ estado: z.enum(['CONFIRMADA', 'CANCELADA']) })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { estado } = v.data
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

    // No bloquea; una sola vez por inscripción aunque se vuelva a confirmar
    const campeonato = inscripcion.campeonato.nombre
    void enviarConfirmacion(inscripcion.userId, `inscripcion_confirmada:${inscripcion.id}`, u => ({
      subject: `Inscripción confirmada: ${campeonato}`,
      html: emailInscripcionConfirmada(u.username, campeonato),
    })).catch(() => null)
  }

  return NextResponse.json(inscripcion)
}
