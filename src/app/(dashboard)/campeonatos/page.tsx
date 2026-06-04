import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CampeonatosClient } from '@/components/campeonatos/CampeonatosClient'

export const metadata = { title: 'Campeonatos' }

export default async function CampeonatosPage() {
  const session = await getServerSession(authOptions)

  const campeonatos = await prisma.campeonato.findMany({
    orderBy: { creadoEn: 'desc' },
    include: {
      _count: { select: { inscripciones: true, carreras: true } },
      inscripciones: session?.user
        ? { where: { userId: session.user.id }, select: { estado: true } }
        : undefined,
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Campeonatos</h1>
        <p className="text-apex-muted mt-1">Compite en los mejores campeonatos de SimRacing en español</p>
      </div>
      <CampeonatosClient
        campeonatos={campeonatos.map(c => ({
          ...c,
          fechaInicio: c.fechaInicio.toISOString(),
          fechaFin: c.fechaFin.toISOString(),
          creadoEn: c.creadoEn.toISOString(),
          inscrito: c.inscripciones?.[0]?.estado || null,
        }))}
        userId={session?.user?.id}
      />
    </div>
  )
}
