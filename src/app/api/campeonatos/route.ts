import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const campeonatos = await prisma.campeonato.findMany({
    orderBy: { creadoEn: 'desc' },
    include: { _count: { select: { inscripciones: true, carreras: true } } },
  })
  return NextResponse.json(campeonatos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { nombre, disciplina, simulador, descripcion, estado, fechaInicio, fechaFin, maxPilotos, modsReq } = body

  if (!nombre || !disciplina || !simulador || !descripcion || !fechaInicio || !fechaFin) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const camp = await prisma.campeonato.create({
    data: {
      nombre, disciplina, simulador, descripcion, estado: estado || 'PROXIMO',
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      maxPilotos: parseInt(maxPilotos) || 20,
      modsReq,
    },
  })

  // Crear sistema de puntos por defecto (F1)
  const puntosFila = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
  await Promise.all(puntosFila.map((pts, i) =>
    prisma.sistemaPuntos.create({
      data: { campeonatoId: camp.id, posicion: i + 1, puntos: pts },
    })
  ))

  // Notificar a todos los pilotos
  const pilotos = await prisma.user.findMany({ where: { role: 'PILOTO' }, select: { id: true } })
  await prisma.notificacion.createMany({
    data: pilotos.map(p => ({
      userId: p.id,
      tipo: 'NUEVO_CAMPEONATO',
      mensaje: `Nuevo campeonato disponible: ${nombre}. ¡Inscríbete ahora!`,
      link: `/campeonatos/${camp.id}`,
    })),
  })

  // Emitir evento Socket.io si está disponible
  const io = (global as any).io
  if (io) {
    io.emit('campeonato:nuevo', { id: camp.id, nombre })
  }

  return NextResponse.json(camp, { status: 201 })
}
