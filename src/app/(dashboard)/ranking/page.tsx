import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RankingClient } from '@/components/campeonatos/RankingClient'

export const metadata = { title: 'Ranking Global' }

export default async function RankingPage() {
  const session = await getServerSession(authOptions)

  const pilotos = await prisma.user.findMany({
    where: { role: 'PILOTO' },
    orderBy: { totalPuntos: 'desc' },
    select: {
      id: true, username: true, avatar: true, pais: true,
      totalPuntos: true, totalCarreras: true, totalVictorias: true, totalPodios: true,
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Ranking Global</h1>
        <p className="text-apex-muted mt-1">Clasificación general de todos los pilotos de APEX</p>
      </div>
      <RankingClient
        pilotos={pilotos}
        currentUserId={session?.user?.id}
      />
    </div>
  )
}
