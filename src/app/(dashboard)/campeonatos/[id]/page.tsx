import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { getSuscripcionActiva } from '@/lib/suscripciones'
import { CampeonatoDetalle } from '@/components/campeonatos/CampeonatoDetalle'
import { getMembresia } from '@/lib/equipos'

export default async function CampeonatoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const suscripcion = session?.user?.id ? await getSuscripcionActiva(session.user.id) : null

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
      inscripcionesEquipo: {
        include: {
          equipo: {
            select: { id: true, nombre: true, colorPrimario: true, logoUrl: true, _count: { select: { miembros: true } } },
          },
        },
        orderBy: { fechaInscripcion: 'asc' },
      },
    },
  })

  if (!campeonato) notFound()
  const esEquipos = campeonato.esCampeonatoEquipos
  const membresia = esEquipos && session?.user?.id ? await getMembresia(session.user.id) : null

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

  // Campeonato de equipos: la clasificación agrupa los puntos por el equipo con el que corrió cada piloto
  let clasificacionEquipos: { equipoId: string; nombre: string; colorPrimario: string | null; logoUrl: string | null; puntos: number; pilotos: number; victorias: number }[] = []
  if (esEquipos && carrerasFinalizadas.length > 0) {
    const resultados = await prisma.resultado.findMany({
      where: { carreraId: { in: carrerasFinalizadas.map(c => c.id) }, equipoId: { not: null } },
      include: { equipo: { select: { nombre: true, colorPrimario: true, logoUrl: true } } },
    })
    const mapa = new Map<string, { nombre: string; colorPrimario: string | null; logoUrl: string | null; puntos: number; pilotos: Set<string>; victorias: number }>()
    for (const r of resultados) {
      if (!r.equipoId || !r.equipo) continue
      const prev = mapa.get(r.equipoId) || { ...r.equipo, puntos: 0, pilotos: new Set<string>(), victorias: 0 }
      prev.puntos += r.puntos
      prev.pilotos.add(r.userId)
      if (r.posicion === 1 && !r.abandono) prev.victorias++
      mapa.set(r.equipoId, prev)
    }
    clasificacionEquipos = Array.from(mapa.entries())
      .map(([equipoId, d]) => ({ equipoId, nombre: d.nombre, colorPrimario: d.colorPrimario, logoUrl: d.logoUrl, puntos: d.puntos, pilotos: d.pilotos.size, victorias: d.victorias }))
      .sort((a, b) => b.puntos - a.puntos)
  }

  const inscripcionActual = esEquipos
    ? (membresia ? campeonato.inscripcionesEquipo.find(i => i.equipoId === membresia.equipoId)?.estado || null : null)
    : session?.user
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
        inscripcionesEquipo: campeonato.inscripcionesEquipo.map(i => ({
          id: i.id,
          estado: i.estado,
          equipo: { ...i.equipo, miembros: i.equipo._count.miembros },
        })),
      }}
      clasificacion={clasificacion}
      clasificacionEquipos={clasificacionEquipos}
      miEquipo={membresia ? { id: membresia.equipoId, esLider: membresia.equipo.liderId === session!.user.id } : null}
      inscripcionActual={inscripcionActual}
      userId={session?.user?.id}
      userPlan={suscripcion?.plan || null}
    />
  )
}
