import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { etiquetaTemporada, getTemporadaActiva, mesYAnio, rankingTemporada } from '@/lib/temporadas'
import { AdminTemporadasClient } from '@/components/admin/AdminTemporadasClient'

export const metadata = { title: 'Temporadas' }
export const dynamic = 'force-dynamic'

export default async function AdminTemporadasPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [activa, temporadas, coches] = await Promise.all([
    getTemporadaActiva(),
    prisma.temporada.findMany({
      orderBy: [{ anio: 'desc' }, { numero: 'desc' }],
      include: {
        cocheEquipo: { select: { id: true, nombre: true } },
        equipoGanador: { select: { id: true, nombre: true, colorPrimario: true } },
      },
    }),
    prisma.cocheEquipo.findMany({ where: { activo: true }, orderBy: { creadoEn: 'desc' }, select: { id: true, nombre: true } }),
  ])
  const ranking = activa ? await rankingTemporada(activa.id) : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Temporadas</h1>
        <p className="text-apex-muted mt-1">T1 enero–abril · T2 mayo–agosto · T3 septiembre–diciembre. El cierre y el paso a la siguiente son automáticos: cada día a las 23:59 (Madrid) se comprueba si es el último día de la temporada.</p>
      </div>
      <AdminTemporadasClient
        anioActual={mesYAnio().anio}
        activa={activa ? {
          id: activa.id, numero: activa.numero, anio: activa.anio,
          fechaInicio: activa.fechaInicio.toISOString(), fechaFin: activa.fechaFin.toISOString(),
          etiqueta: etiquetaTemporada(activa).texto,
          coche: activa.cocheEquipo ? { id: activa.cocheEquipo.id, nombre: activa.cocheEquipo.nombre } : null,
        } : null}
        ranking={ranking}
        temporadas={temporadas.map(t => ({
          id: t.id, numero: t.numero, anio: t.anio, activa: t.activa,
          fechaInicio: t.fechaInicio.toISOString(), fechaFin: t.fechaFin.toISOString(),
          coche: t.cocheEquipo, ganador: t.equipoGanador,
        }))}
        coches={coches}
      />
    </div>
  )
}
