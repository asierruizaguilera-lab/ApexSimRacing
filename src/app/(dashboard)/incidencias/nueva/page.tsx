import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { NuevaIncidenciaClient } from '@/components/incidencias/NuevaIncidenciaClient'

export const metadata = { title: 'Nueva Incidencia' }

export default async function NuevaIncidenciaPage({ searchParams }: { searchParams: { carreraId?: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  let carrera: {
    id: string; nombre: string; circuito: string
    campeonato: { id: string; nombre: string }
    pilotos: { id: string; username: string }[]
  } | null = null

  if (searchParams.carreraId) {
    const c = await prisma.carrera.findUnique({
      where: { id: searchParams.carreraId },
      include: {
        campeonato: {
          include: {
            inscripciones: {
              where: { estado: 'CONFIRMADA' },
              include: { user: { select: { id: true, username: true } } },
            },
          },
        },
      },
    })

    const inscrito = c?.campeonato.inscripciones.some(i => i.userId === session.user.id)
    if (c && inscrito) {
      carrera = {
        id: c.id,
        nombre: c.nombre,
        circuito: c.circuito,
        campeonato: { id: c.campeonato.id, nombre: c.campeonato.nombre },
        pilotos: c.campeonato.inscripciones
          .filter(i => i.userId !== session.user.id)
          .map(i => i.user),
      }
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{carrera ? 'Reportar Incidencia de Carrera' : 'Nueva Queja General'}</h1>
        <p className="text-apex-muted mt-1">
          {carrera
            ? 'Describe lo ocurrido durante la carrera con el mayor detalle posible'
            : 'Reporta un problema general de la plataforma, conducta u otro asunto'}
        </p>
      </div>
      <NuevaIncidenciaClient carrera={carrera} />
    </div>
  )
}
