import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlanesGrid } from '@/components/planes/PlanesGrid'
import Link from 'next/link'
import { Star, ArrowLeft } from 'lucide-react'
import { ErrorAcceso } from '@/components/acceso/ErrorAcceso'
import { ErrorLecturaFlag, leerTemporadaGratuita } from '@/lib/accesoServidor'

export const metadata = { title: 'Planes de Suscripción' }

export default async function PlanesPage() {
  const session = await getServerSession(authOptions)

  let temporadaGratuitaActiva: boolean
  try {
    temporadaGratuitaActiva = await leerTemporadaGratuita('planes')
  } catch (e) {
    if (e instanceof ErrorLecturaFlag) return <ErrorAcceso />
    throw e
  }
  const suscripcion = session?.user?.id
    ? await prisma.suscripcion.findFirst({
        where: { userId: session.user.id, estado: { in: ['ACTIVA', 'GRATUITA'] } },
      })
    : null

  return (
    <div>
      {/* /planes nunca es un callejón sin salida: / lleva al dashboard o a la landing según el acceso */}
      <Link href="/"
        className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-apex-card border border-apex-border hover:border-apex-red/40 text-apex-text rounded-xl text-sm font-medium transition-colors">
        <ArrowLeft size={14} />Volver al inicio
      </Link>
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
          esFounder: suscripcion.esFounder,
        } : null}
        userId={session?.user?.id}
        temporadaGratuitaActiva={temporadaGratuitaActiva}
      />
    </div>
  )
}
