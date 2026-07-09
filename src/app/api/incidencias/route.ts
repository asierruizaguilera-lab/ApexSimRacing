import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { TipoQueja } from '@prisma/client'

const TIPOS: TipoQueja[] = ['INCIDENCIA_CARRERA', 'QUEJA_GENERAL']

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json([], { status: 401 })

  const quejas = await prisma.queja.findMany({
    where: { OR: [{ denuncianteId: session.user.id }, { denunciadoId: session.user.id }] },
    orderBy: { creadoEn: 'desc' },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: { select: { id: true, nombre: true, campeonato: { select: { id: true, nombre: true } } } },
      _count: { select: { pruebas: true } },
    },
  })

  return NextResponse.json(quejas)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { tipo, titulo, descripcion, denunciadoId, carreraId, vuelta, linkRepeticion } = await req.json()

  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  if (!titulo?.trim() || !descripcion?.trim()) {
    return NextResponse.json({ error: 'Título y descripción son requeridos' }, { status: 400 })
  }
  if (denunciadoId && denunciadoId === session.user.id) {
    return NextResponse.json({ error: 'No puedes reportarte a ti mismo' }, { status: 400 })
  }

  if (tipo === 'INCIDENCIA_CARRERA') {
    if (!carreraId) return NextResponse.json({ error: 'La carrera es requerida' }, { status: 400 })

    const carrera = await prisma.carrera.findUnique({
      where: { id: carreraId },
      include: {
        campeonato: {
          include: { inscripciones: { where: { userId: session.user.id, estado: 'CONFIRMADA' } } },
        },
      },
    })
    if (!carrera) return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })
    if (carrera.campeonato.inscripciones.length === 0) {
      return NextResponse.json(
        { error: 'Debes estar inscrito en el campeonato de esta carrera para reportar una incidencia' },
        { status: 403 }
      )
    }

    const queja = await prisma.queja.create({
      data: {
        tipo,
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        denuncianteId: session.user.id,
        denunciadoId: denunciadoId || null,
        carreraId,
        vuelta: vuelta ? Number(vuelta) : null,
        linkRepeticion: linkRepeticion || null,
      },
    })
    return NextResponse.json(queja, { status: 201 })
  }

  const queja = await prisma.queja.create({
    data: {
      tipo: 'QUEJA_GENERAL',
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      denuncianteId: session.user.id,
      denunciadoId: denunciadoId || null,
    },
  })
  return NextResponse.json(queja, { status: 201 })
}
