import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CalendarioClient } from '@/components/CalendarioClient'

export const metadata = { title: 'Calendario' }

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions)

  const carreras = await prisma.carrera.findMany({
    orderBy: { fecha: 'asc' },
    include: {
      campeonato: {
        select: { id: true, nombre: true, disciplina: true, simulador: true },
      },
    },
  })

  // IDs de campeonatos donde el usuario está inscrito (confirmado)
  let inscripcionIds: string[] = []
  if (session?.user?.id) {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { userId: session.user.id, estado: 'CONFIRMADA' },
      select: { campeonatoId: true },
    })
    inscripcionIds = inscripciones.map(i => i.campeonatoId)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendario de Carreras</h1>
        <p className="text-apex-muted mt-1">Todos los eventos programados en APEX</p>
      </div>
      <CalendarioClient
        carreras={carreras.map(c => ({
          ...c,
          fecha: c.fecha.toISOString(),
          campeonato: c.campeonato,
        }))}
        inscripcionIds={inscripcionIds}
      />
    </div>
  )
}
