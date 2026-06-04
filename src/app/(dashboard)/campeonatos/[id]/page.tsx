import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { CampeonatoDetalle } from '@/components/campeonatos/CampeonatoDetalle'

export default async function CampeonatoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const campeonato = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: {
      carreras: { orderBy: { fecha: 'asc' } },
      inscripciones: {
        where: { estado: 'CONFIRMADA' },
        include: { user: { select: { id: true, username: true, avatar: true, pais: true, totalPuntos: true } } },
        orderBy: { fechaInscripcion: 'asc' },
      },
      sistemaPuntos: { orderBy: { posicion: 'asc' } },
    },
  })

  if (!campeonato) notFound()

  // Clasificación del campeonato
  const pilotos = campeonato.inscripciones.map(i => i.user)
  const carrerasFinalizadas = campeonato.carreras.filter(c => c.estado === 'FINALIZADA')

  let clasificacion: { userId: string; username: string; avatar: string | null; pais: string | null; puntos: number; carreras: number; victorias: number }[] = []

  if (carrerasFinalizadas.length > 0) {
    const resultados = await prisma.resultado.findMany({
      where: { carreraId: { in: carrerasFinalizadas.map(c => c.id) } },
      include: { user: { select: { username: true, avatar: true, pais: true } } },
    })

    const statsMap = new Map<string, { username: string; avatar: string | null; pais: string | null; puntos: number; carreras: number; victorias: number }>()
    for (const r of resultados) {
      const prev = statsMap.get(r.userId) || { username: r.user.username, avatar: r.user.avatar, pais: r.user.pais, puntos: 0, carreras: 0, victorias: 0 }
      statsMap.set(r.userId, {
        ...prev,
        puntos: prev.puntos + r.puntos,
        carreras: prev.carreras + 1,
        victorias: prev.victorias + (r.posicion === 1 ? 1 : 0),
      })
    }
    clasificacion = Array.from(statsMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.puntos - a.puntos)
  }

  const inscripcionActual = session?.user
    ? campeonato.inscripciones.find(i => i.userId === session.user.id)?.estado || null
    : null

  return (
    <CampeonatoDetalle
      campeonato={{
        ...campeonato,
        fechaInicio: campeonato.fechaInicio.toISOString(),
        fechaFin: campeonato.fechaFin.toISOString(),
        creadoEn: campeonato.creadoEn.toISOString(),
        carreras: campeonato.carreras.map(c => ({ ...c, fecha: c.fecha.toISOString() })),
        inscripciones: campeonato.inscripciones.map(i => ({
          ...i,
          fechaInscripcion: i.fechaInscripcion.toISOString(),
        })),
      }}
      clasificacion={clasificacion}
      inscripcionActual={inscripcionActual}
      userId={session?.user?.id}
    />
  )
}
