import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularStatsPiloto } from '@/lib/statsPiloto'
import { validarBody, z, disciplina, fecha, numeroFlexible, plan } from '@/lib/validacion'

const Campeonato = z.object({
  nombre: z.string().trim().min(1).max(150),
  disciplina,
  descripcion: z.string().max(5000),
  estado: z.enum(['PROXIMO', 'ACTIVO', 'FINALIZADO']).optional(),
  fechaInicio: fecha,
  fechaFin: fecha,
  maxPilotos: numeroFlexible.nullable().optional(),
  modsReq: z.string().max(2000).nullable().optional(),
  numEtapas: numeroFlexible.nullable().optional(),
  categoriaMinima: plan.optional(),
  soloElite: z.boolean().optional(),
  esCampeonatoEquipos: z.boolean().optional(),
  temporadaId: z.string().max(64).nullable().optional(),
  esIniciacion: z.boolean().optional(),
})

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

  const v = await validarBody(req, Campeonato)
  if (!v.ok) return v.res
  const body = v.data
  const { nombre, disciplina, descripcion, estado, fechaInicio, fechaFin, maxPilotos, modsReq, numEtapas, categoriaMinima, soloElite, esCampeonatoEquipos, temporadaId, esIniciacion } = body

  const anterior = await prisma.campeonato.findUnique({ where: { id: params.id }, select: { esIniciacion: true } })
  if (!anterior) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const camp = await prisma.campeonato.update({
    where: { id: params.id },
    data: {
      nombre, disciplina, descripcion, estado,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      maxPilotos: Math.trunc(maxPilotos ?? 0) || 20,
      modsReq,
      numEtapas: Math.trunc(numEtapas ?? 0) || 1,
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
