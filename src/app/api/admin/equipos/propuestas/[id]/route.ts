import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ESTADOS = ['PENDIENTE', 'REVISANDO', 'ACEPTADA', 'RECHAZADA'] as const

// Responder una propuesta. Body: { estado, respuestaAdmin? }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { estado, respuestaAdmin } = await req.json()
  if (!ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const respuesta = typeof respuestaAdmin === 'string' ? respuestaAdmin.trim().slice(0, 2000) || null : null
  const resuelta = estado === 'ACEPTADA' || estado === 'RECHAZADA'

  const propuesta = await prisma.propuestaEquipo.update({
    where: { id: params.id },
    data: { estado, respuestaAdmin: respuesta, respondidoEn: resuelta ? new Date() : null },
    include: { equipo: { select: { id: true, nombre: true } } },
  })

  if (estado !== 'PENDIENTE') {
    const texto = estado === 'REVISANDO' ? 'está siendo revisada'
      : estado === 'ACEPTADA' ? 'ha sido aceptada 🎉' : 'ha sido rechazada'
    await prisma.notificacion.create({
      data: {
        userId: propuesta.liderId,
        tipo: 'EQUIPO',
        mensaje: `La propuesta "${propuesta.titulo}" de ${propuesta.equipo.nombre} ${texto}`,
        link: `/equipos/${propuesta.equipo.id}`,
      },
    })
  }
  return NextResponse.json(propuesta)
}
