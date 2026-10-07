import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminCampeonatoClient } from '@/components/admin/AdminCampeonatoClient'

export default async function AdminCampeonatoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const isNew = params.id === 'nuevo'

  const temporadas = (await prisma.temporada.findMany({
    orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
    select: { id: true, numero: true, anio: true, activa: true },
  }))

  if (isNew) {
    return <AdminCampeonatoClient campeonato={null} temporadas={temporadas} />
  }

  const campeonato = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: {
      carreras: { orderBy: { fecha: 'asc' } },
      inscripciones: {
        include: { user: { select: { id: true, username: true, email: true, pais: true } } },
        orderBy: { fechaInscripcion: 'asc' },
      },
      inscripcionesEquipo: {
        include: { equipo: { select: { id: true, nombre: true, colorPrimario: true, lider: { select: { username: true } }, _count: { select: { miembros: true } } } } },
        orderBy: { fechaInscripcion: 'asc' },
      },
    },
  })

  if (!campeonato) notFound()

  return (
    <AdminCampeonatoClient
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
          fechaInscripcion: i.fechaInscripcion.toISOString(),
          equipo: { id: i.equipo.id, nombre: i.equipo.nombre, colorPrimario: i.equipo.colorPrimario, lider: i.equipo.lider.username, miembros: i.equipo._count.miembros },
        })),
      }}
      temporadas={temporadas}
    />
  )
}
