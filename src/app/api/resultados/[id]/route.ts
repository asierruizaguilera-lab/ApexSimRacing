import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailResultadoPublicado } from '@/lib/email'
import { calcularPuntos, tieneVueltaRapida } from '@/lib/puntos'
import { mesYAnio, recalcularPuntosEquipoMes } from '@/lib/temporadas'
import { recalcularStatsPiloto } from '@/lib/statsPiloto'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { resultados } = await req.json()
  if (!Array.isArray(resultados)) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })

  const carrera = await prisma.carrera.findUnique({
    where: { id: params.id },
    include: { campeonato: { select: { nombre: true, disciplina: true, numEtapas: true, esCampeonatoEquipos: true } } },
  })
  if (!carrera) return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })

  const { disciplina, numEtapas, esCampeonatoEquipos } = carrera.campeonato
  const conVueltaRapida = tieneVueltaRapida(disciplina)

  // Campeonatos de equipos: cada resultado se atribuye al equipo por el que corre el piloto. Debe ser un
  // equipo con inscripción confirmada y el piloto debe ser miembro (o ya figurar con ese equipo en un
  // resultado anterior de esta carrera, por si se fue del equipo después de correr).
  const equipoPorUsuario = new Map<string, string>()
  if (esCampeonatoEquipos) {
    const [inscritos, existentes] = await Promise.all([
      prisma.inscripcionEquipo.findMany({
        where: { campeonatoId: carrera.campeonatoId, estado: 'CONFIRMADA' },
        select: { equipoId: true },
      }),
      prisma.resultado.findMany({ where: { carreraId: params.id }, select: { userId: true, equipoId: true } }),
    ])
    const equiposValidos = new Set(inscritos.map(i => i.equipoId))
    const miembros = await prisma.miembroEquipo.findMany({
      where: { userId: { in: resultados.map((r: any) => String(r.userId)) } },
      select: { userId: true, equipoId: true },
    })
    const equipoActual = new Map(miembros.map(m => [m.userId, m.equipoId]))
    const equipoAnterior = new Map(existentes.map(e => [e.userId, e.equipoId]))

    for (const r of resultados) {
      const equipoId = String(r.equipoId ?? '')
      const perteneceAhora = equipoActual.get(r.userId) === equipoId
      const pertenecia = equipoAnterior.get(r.userId) === equipoId
      if (!equiposValidos.has(equipoId) || (!perteneceAhora && !pertenecia)) {
        return NextResponse.json({ error: 'Cada piloto debe correr por un equipo inscrito y confirmado del que sea miembro' }, { status: 400 })
      }
      equipoPorUsuario.set(r.userId, equipoId)
    }
  }

  // Upsert resultados — los puntos siempre se recalculan en el servidor, nunca se confía en el valor del cliente
  const puntosPorUsuario = new Map<string, number>()
  for (const r of resultados) {
    const vueltaRapida = conVueltaRapida && !!r.vueltaRapida
    const puntos = calcularPuntos(r.posicion, disciplina, numEtapas, !!r.abandono, vueltaRapida)
    const equipoId = equipoPorUsuario.get(r.userId) ?? null
    puntosPorUsuario.set(r.userId, puntos)
    await prisma.resultado.upsert({
      where: { carreraId_userId: { carreraId: params.id, userId: r.userId } },
      update: { posicion: r.posicion, puntos, vueltaRapida, abandono: r.abandono, tiempo: r.tiempo, equipoId },
      create: { carreraId: params.id, userId: r.userId, posicion: r.posicion, puntos, vueltaRapida, abandono: r.abandono, tiempo: r.tiempo, equipoId },
    })
  }

  // En equipos el admin marca quién participó: los resultados de pilotos que ya no vienen se eliminan
  if (esCampeonatoEquipos) {
    const enviados = resultados.map((r: any) => r.userId)
    const sobrantes = await prisma.resultado.findMany({
      where: { carreraId: params.id, userId: { notIn: enviados } },
      select: { userId: true },
    })
    if (sobrantes.length > 0) {
      await prisma.resultado.deleteMany({ where: { carreraId: params.id, userId: { notIn: enviados } } })
      for (const s of sobrantes) await recalcularStatsPiloto(s.userId)
    }
  }

  // Actualizar estado carrera a FINALIZADA
  await prisma.carrera.update({
    where: { id: params.id },
    data: { estado: 'FINALIZADA' },
  })

  // Recalcular stats de cada piloto
  for (const r of resultados) {
    const puntos = puntosPorUsuario.get(r.userId) ?? 0
    await recalcularStatsPiloto(r.userId)

    // Notificación
    await prisma.notificacion.create({
      data: {
        userId: r.userId,
        tipo: 'RESULTADO_PUBLICADO',
        mensaje: `Resultados de ${carrera.nombre} publicados. Tu posición: ${r.posicion}º (${puntos} pts)`,
        link: `/campeonatos/${carrera.campeonatoId}`,
      },
    })

    // Email (opcional)
    try {
      const user = await prisma.user.findUnique({ where: { id: r.userId }, select: { email: true, username: true } })
      if (user) {
        sendEmail({
          to: user.email,
          subject: `Resultados publicados: ${carrera.nombre}`,
          html: emailResultadoPublicado(user.username, carrera.nombre, r.posicion, puntos),
        })
      }
    } catch {}
  }

  // Liga por equipos: recalcula los puntos del mes de la carrera
  if (esCampeonatoEquipos) {
    const { mes, anio } = mesYAnio(carrera.fecha)
    await recalcularPuntosEquipoMes(mes, anio)
  }

  // Emitir evento
  const io = (global as any).io
  if (io) {
    io.emit('resultados:publicados', { carreraId: params.id, nombre: carrera.nombre })
  }

  return NextResponse.json({ ok: true })
}
