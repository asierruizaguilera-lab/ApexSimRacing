import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z, id, fecha, numeroFlexible, urlSegura } from '@/lib/validacion'

const Carrera = z.object({
  campeonatoId: id,
  nombre: z.string().trim().min(1).max(150),
  circuito: z.string().trim().min(1).max(150),
  fecha,
  duracionMin: numeroFlexible.nullable().optional(),
  servidorIP: z.string().max(200).nullable().optional(),
  servidorPassword: z.string().max(200).nullable().optional(),
  transmisionUrl: urlSegura.nullable().optional(),
  modsRequeridos: z.string().max(2000).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const v = await validarBody(req, Carrera)
  if (!v.ok) return v.res
  const { campeonatoId, nombre, circuito, fecha, duracionMin, servidorIP, servidorPassword, transmisionUrl, modsRequeridos } = v.data

  if (!campeonatoId || !nombre || !circuito || !fecha) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const carrera = await prisma.carrera.create({
    data: {
      campeonatoId, nombre, circuito,
      fecha: new Date(fecha),
      duracionMin: Math.trunc(duracionMin ?? 0) || 60,
      servidorIP: servidorIP || null, servidorPassword: servidorPassword || null,
      transmisionUrl: transmisionUrl || null, modsRequeridos: modsRequeridos || null,
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
