import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularStatsPiloto } from '@/lib/statsPiloto'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const camp = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: {
      carreras: { orderBy: { fecha: 'asc' } },
      inscripciones: { include: { user: { select: { id: true, username: true, avatar: true, pais: true } } } },
      sistemaPuntos: { orderBy: { posicion: 'asc' } },
    },
  })
  if (!camp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(camp)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { nombre, disciplina, descripcion, estado, fechaInicio, fechaFin, maxPilotos, modsReq, numEtapas, categoriaMinima, soloElite, esCampeonatoEquipos, temporadaId, esIniciacion } = body

  const anterior = await prisma.campeonato.findUnique({ where: { id: params.id }, select: { esIniciacion: true } })
  if (!anterior) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const camp = await prisma.campeonato.update({
    where: { id: params.id },
    data: {
      nombre, disciplina, descripcion, estado,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      maxPilotos: parseInt(maxPilotos) || 20,
      modsReq,
      numEtapas: parseInt(numEtapas) || 1,
      categoriaMinima: esIniciacion ? 'ROOKIE' : (categoriaMinima || 'ROOKIE'),
      soloElite: !esIniciacion && !!soloElite,
      esCampeonatoEquipos: !esIniciacion && !!esCampeonatoEquipos,
      esIniciacion: !!esIniciacion,
      temporadaId: temporadaId || null,
    },
  })

  // Si cambia el carácter de iniciación, se re-etiquetan sus resultados y se recalcula el ranking de esos pilotos
  if (anterior.esIniciacion !== camp.esIniciacion) {
    const filtro = { carrera: { campeonatoId: camp.id } }
    await prisma.resultado.updateMany({ where: filtro, data: { esIniciacion: camp.esIniciacion } })
    const pilotos = await prisma.resultado.findMany({ where: filtro, select: { userId: true }, distinct: ['userId'] })
    for (const p of pilotos) await recalcularStatsPiloto(p.userId)
  }
  return NextResponse.json(camp)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.campeonato.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
