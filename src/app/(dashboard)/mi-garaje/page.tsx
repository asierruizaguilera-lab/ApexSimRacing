import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GarajeClient } from '@/components/garaje/GarajeClient'
import { Car } from 'lucide-react'

export const metadata = { title: 'Mi Garaje' }

export default async function MiGarajePage() {
  const session = await getServerSession(authOptions)

  const [suscripcion, cochesDesbloqueados] = await Promise.all([
    session?.user?.id
      ? prisma.suscripcion.findFirst({
          where: { userId: session.user.id, estado: { in: ['ACTIVA', 'GRATUITA'] } },
          select: { plan: true, estado: true },
        })
      : null,
    session?.user?.id
      ? prisma.cocheDesbloqueado.findMany({
          where: { userId: session.user.id },
          include: {
            coche: {
              select: { id: true, nombre: true, disciplina: true, planMinimo: true, descripcion: true, imagen: true, modAC: true },
            },
          },
          orderBy: { creadoEn: 'asc' },
        })
      : [],
  ])

  const coches = cochesDesbloqueados.map(c => c.coche)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-apex-card border border-apex-border rounded-xl flex items-center justify-center">
          <Car size={20} className="text-apex-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Mi Garaje</h1>
          <p className="text-apex-muted text-sm">Tus coches desbloqueados por disciplina</p>
        </div>
      </div>

      <GarajeClient
        coches={coches}
        suscripcionActual={suscripcion}
      />
    </div>
  )
}
