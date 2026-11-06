import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GarajeClient } from '@/components/garaje/GarajeClient'
import { Car } from 'lucide-react'
import { ErrorAcceso } from '@/components/acceso/ErrorAcceso'
import { ErrorLecturaFlag, leerTemporadaGratuita } from '@/lib/accesoServidor'

const SELECT_COCHE = { id: true, nombre: true, disciplina: true, planMinimo: true, descripcion: true, imagen: true, imagenUrl: true, linkDescarga: true } as const

export const metadata = { title: 'Mi Garaje' }

export default async function MiGarajePage() {
  const session = await getServerSession(authOptions)

  // Con la temporada gratuita activa se muestra todo el catálogo activo, sin crear registros cocheDesbloqueado
  let temporadaGratuita: boolean
  try {
    temporadaGratuita = await leerTemporadaGratuita('mi-garaje')
  } catch (e) {
    if (e instanceof ErrorLecturaFlag) return <ErrorAcceso />
    throw e
  }

  const [suscripcion, coches, carrerasConMods] = await Promise.all([
    session?.user?.id
      ? prisma.suscripcion.findFirst({
          where: { userId: session.user.id, estado: { in: ['ACTIVA', 'GRATUITA'] } },
          select: { plan: true, estado: true },
        })
      : null,
    temporadaGratuita
      ? prisma.coche.findMany({ where: { activo: true }, select: SELECT_COCHE, orderBy: { creadoEn: 'asc' } })
      : session?.user?.id
        ? prisma.cocheDesbloqueado.findMany({
            where: { userId: session.user.id },
            include: { coche: { select: SELECT_COCHE } },
            orderBy: { creadoEn: 'asc' },
          }).then(ds => ds.map(d => d.coche))
        : [],
    session?.user?.id
      ? prisma.carrera.findMany({
          where: {
            estado: { not: 'FINALIZADA' },
            OR: [{ linkModCircuito: { not: null } }, { linkModCoche: { not: null } }],
            campeonato: { inscripciones: { some: { userId: session.user.id, estado: 'CONFIRMADA' } } },
          },
          orderBy: { fecha: 'asc' },
          select: {
            id: true, nombre: true, circuito: true, fecha: true, coche: true,
            linkModCircuito: true, linkModCoche: true,
            campeonato: { select: { id: true, nombre: true } },
          },
        })
      : [],
  ])

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
        temporadaGratuita={temporadaGratuita}
        carrerasConMods={carrerasConMods.map(c => ({ ...c, fecha: c.fecha.toISOString() }))}
      />
    </div>
  )
}
