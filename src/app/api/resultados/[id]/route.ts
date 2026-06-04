import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailResultadoPublicado } from '@/lib/email'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { resultados } = await req.json()
  if (!Array.isArray(resultados)) return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })

  const carrera = await prisma.carrera.findUnique({
    where: { id: params.id },
    include: { campeonato: { select: { nombre: true } } },
  })
  if (!carrera) return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 })

  // Upsert resultados
  for (const r of resultados) {
    await prisma.resultado.upsert({
      where: { carreraId_userId: { carreraId: params.id, userId: r.userId } },
      update: { posicion: r.posicion, puntos: r.puntos, vueltaRapida: r.vueltaRapida, abandono: r.abandono, tiempo: r.tiempo },
      create: { carreraId: params.id, userId: r.userId, posicion: r.posicion, puntos: r.puntos, vueltaRapida: r.vueltaRapida, abandono: r.abandono, tiempo: r.tiempo },
    })
  }

  // Actualizar estado carrera a FINALIZADA
  await prisma.carrera.update({
    where: { id: params.id },
    data: { estado: 'FINALIZADA' },
  })

  // Recalcular stats de cada piloto
  for (const r of resultados) {
    const allResults = await prisma.resultado.findMany({ where: { userId: r.userId } })
    const totalPuntos = allResults.reduce((s, res) => s + res.puntos, 0)
    const totalCarreras = allResults.filter(res => !res.abandono).length
    const totalVictorias = allResults.filter(res => res.posicion === 1).length
    const totalPodios = allResults.filter(res => res.posicion <= 3).length

    await prisma.user.update({
      where: { id: r.userId },
      data: { totalPuntos, totalCarreras, totalVictorias, totalPodios },
    })

    // Notificación
    await prisma.notificacion.create({
      data: {
        userId: r.userId,
        tipo: 'RESULTADO_PUBLICADO',
        mensaje: `Resultados de ${carrera.nombre} publicados. Tu posición: ${r.posicion}º (${r.puntos} pts)`,
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
          html: emailResultadoPublicado(user.username, carrera.nombre, r.posicion, r.puntos),
        })
      }
    } catch {}
  }

  // Emitir evento
  const io = (global as any).io
  if (io) {
    io.emit('resultados:publicados', { carreraId: params.id, nombre: carrera.nombre })
  }

  return NextResponse.json({ ok: true })
}
