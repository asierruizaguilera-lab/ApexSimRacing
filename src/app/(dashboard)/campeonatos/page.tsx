import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSuscripcionActiva } from '@/lib/suscripciones'
import { CampeonatosClient } from '@/components/campeonatos/CampeonatosClient'
import { getMembresia } from '@/lib/equipos'

export const metadata = { title: 'Campeonatos' }

export default async function CampeonatosPage() {
  const session = await getServerSession(authOptions)
  const membresia = session?.user?.id ? await getMembresia(session.user.id) : null
  const miEquipoId = membresia?.equipoId

  const [campeonatos, patrocinadores, suscripcion] = await Promise.all([
    prisma.campeonato.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: {
          select: {
            inscripciones: true,
            carreras: true,
            inscripcionesEquipo: { where: { estado: { in: ['PENDIENTE', 'CONFIRMADA'] } } },
          },
        },
        inscripciones: session?.user
          ? { where: { userId: session.user.id }, select: { estado: true } }
          : undefined,
        inscripcionesEquipo: miEquipoId
          ? { where: { equipoId: miEquipoId }, select: { estado: true } }
          : undefined,
      },
    }),
    prisma.patrocinador.findMany({
      where: { activo: true, ubicaciones: { hasSome: ['CAMPEONATOS', 'TODAS'] } },
      orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
      select: { id: true, nombre: true, descripcion: true, logoUrl: true, linkExterno: true },
    }),
    session?.user?.id ? getSuscripcionActiva(session.user.id) : null,
  ])

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
          inscrito: c.esCampeonatoEquipos
            ? c.inscripcionesEquipo?.[0]?.estado || null
            : c.inscripciones?.[0]?.estado || null,
        }))}
        miEquipo={membresia ? { id: membresia.equipoId, nombre: membresia.equipo.nombre, esLider: membresia.equipo.liderId === session!.user.id } : null}
        userId={session?.user?.id}
        userPlan={suscripcion?.plan || null}
        patrocinadores={patrocinadores}
      />
    </div>
  )
}
