import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { esEliteActivo, getMembresia } from '@/lib/equipos'
import { etiquetaTemporada, getTemporadaActiva, mesYAnio, nombreMes, rankingEquiposMes } from '@/lib/temporadas'
import { EquiposClient } from '@/components/equipos/EquiposClient'

export const metadata = { title: 'Equipos' }
export const dynamic = 'force-dynamic'

export default async function EquiposPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id
  const { mes, anio } = mesYAnio()

  const [ranking, temporada, membresia, elite, invitaciones] = await Promise.all([
    rankingEquiposMes(mes, anio),
    getTemporadaActiva(),
    getMembresia(userId),
    esEliteActivo(userId),
    prisma.invitacionEquipo.findMany({
      where: { invitadoId: userId, estado: 'PENDIENTE', equipo: { activo: true } },
      orderBy: { creadoEn: 'desc' },
      include: {
        equipo: {
          select: {
            id: true, nombre: true, colorPrimario: true, logoUrl: true,
            lider: { select: { username: true } }, _count: { select: { miembros: true } },
          },
        },
      },
    }),
  ])

  return (
    <EquiposClient
      equipos={ranking}
      mesNombre={`${nombreMes(mes)} ${anio}`}
      temporada={temporada ? etiquetaTemporada(temporada).texto : null}
      miEquipoId={membresia?.equipoId ?? null}
      puedeCrear={!membresia && (elite || session!.user.role === 'ADMIN')}
      esElite={elite}
      invitaciones={invitaciones.map(i => ({
        id: i.id,
        creadoEn: i.creadoEn.toISOString(),
        equipo: { ...i.equipo, miembros: i.equipo._count.miembros, lider: i.equipo.lider.username },
      }))}
    />
  )
}
