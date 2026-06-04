import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { campeonatoId, nombre, circuito, fecha, duracionMin, servidorIP, servidorPassword, transmisionUrl, modsRequeridos } = await req.json()

  if (!campeonatoId || !nombre || !circuito || !fecha) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const carrera = await prisma.carrera.create({
    data: {
      campeonatoId, nombre, circuito,
      fecha: new Date(fecha),
      duracionMin: parseInt(duracionMin) || 60,
      servidorIP, servidorPassword, transmisionUrl, modsRequeridos,
    },
  })

  // Notificar a inscritos
  const inscripciones = await prisma.inscripcion.findMany({
    where: { campeonatoId, estado: 'CONFIRMADA' },
    select: { userId: true },
  })

  const camp = await prisma.campeonato.findUnique({ where: { id: campeonatoId }, select: { nombre: true } })

  if (inscripciones.length > 0) {
    await prisma.notificacion.createMany({
      data: inscripciones.map(i => ({
        userId: i.userId,
        tipo: 'NUEVA_CARRERA' as const,
        mensaje: `Nueva carrera en ${camp?.nombre}: ${nombre} el ${new Date(fecha).toLocaleDateString('es-ES')}`,
        link: `/campeonatos/${campeonatoId}`,
      })),
    })
  }

  const io = (global as any).io
  if (io) {
    io.emit('carrera:nueva', { id: carrera.id, nombre, campeonatoId })
  }

  return NextResponse.json(carrera, { status: 201 })
}
