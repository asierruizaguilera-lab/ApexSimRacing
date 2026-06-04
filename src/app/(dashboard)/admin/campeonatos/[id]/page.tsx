import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminCampeonatoClient } from '@/components/admin/AdminCampeonatoClient'

export default async function AdminCampeonatoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const isNew = params.id === 'nuevo'

  if (isNew) {
    return <AdminCampeonatoClient campeonato={null} />
  }

  const campeonato = await prisma.campeonato.findUnique({
    where: { id: params.id },
    include: {
      carreras: { orderBy: { fecha: 'asc' } },
      inscripciones: {
        include: { user: { select: { id: true, username: true, email: true, pais: true } } },
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
      }}
    />
  )
}
