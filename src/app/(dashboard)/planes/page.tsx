import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanesGrid } from '@/components/planes/PlanesGrid'
import { Star } from 'lucide-react'

export const metadata = { title: 'Planes de Suscripción' }

export default async function PlanesPage() {
  const session = await getServerSession(authOptions)

  const suscripcion = session?.user?.id
    ? await prisma.suscripcion.findFirst({
        where: { userId: session.user.id, estado: 'ACTIVA' },
      })
    : null

  return (
    <div>
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-apex-red/10 border border-apex-red/30 rounded-xl mb-4">
          <Star size={24} className="text-apex-red" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Planes APEX</h1>
        <p className="text-apex-muted max-w-xl mx-auto">
          Elige tu plan y accede a coches exclusivos de SimRacing. Todos los planes incluyen
          acceso completo a la comunidad y competición.
        </p>
      </div>

      <PlanesGrid
        suscripcionActual={suscripcion ? {
          id: suscripcion.id,
          plan: suscripcion.plan,
          estado: suscripcion.estado,
          fechaRenovacion: suscripcion.fechaRenovacion.toISOString(),
          stripeSubscriptionId: suscripcion.stripeSubscriptionId,
        } : null}
        userId={session?.user?.id}
      />
    </div>
  )
}
