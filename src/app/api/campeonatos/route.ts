import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

export async function GET() {
  const campeonatos = await prisma.campeonato.findMany({
    orderBy: { creadoEn: 'desc' },
    include: { _count: { select: { inscripciones: true, inscripcionesEquipo: true, carreras: true } } },
  })
  return NextResponse.json(campeonatos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const v = await validarBody(req, Campeonato)
  if (!v.ok) return v.res
  const body = v.data
  const { nombre, disciplina, descripcion, estado, fechaInicio, fechaFin, maxPilotos, modsReq, numEtapas, categoriaMinima, soloElite, esCampeonatoEquipos, temporadaId, esIniciacion } = body

  if (!descripcion.trim()) {
    return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 })
  }

  const camp = await prisma.campeonato.create({
    data: {
      nombre, disciplina, descripcion, estado: estado || 'PROXIMO',
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      maxPilotos: Math.trunc(maxPilotos ?? 0) || 20,
      modsReq,
      numEtapas: Math.trunc(numEtapas ?? 0) || 1,
      // La iniciación es gratuita: sin categoría mínima ni restricción Elite, y siempre individual
      categoriaMinima: esIniciacion ? 'ROOKIE' : (categoriaMinima || 'ROOKIE'),
      soloElite: !esIniciacion && !!soloElite,
      esCampeonatoEquipos: !esIniciacion && !!esCampeonatoEquipos,
      esIniciacion: !!esIniciacion,
      temporadaId: temporadaId || null,
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
      mensaje: esIniciacion
        ? `🏁 Temporada de iniciación gratuita: ${nombre}. ¡Inscríbete gratis!`
        : esCampeonatoEquipos
        ? `Nuevo campeonato por equipos: ${nombre}. ¡Habla con tu líder para inscribir al equipo!`
        : `Nuevo campeonato disponible: ${nombre}. ¡Inscríbete ahora!`,
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
