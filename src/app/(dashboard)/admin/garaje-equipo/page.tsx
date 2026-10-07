import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AdminGarajeEquipoClient } from '@/components/admin/AdminGarajeEquipoClient'

export const metadata = { title: 'Garaje de Equipo' }
export const dynamic = 'force-dynamic'

export default async function AdminGarajeEquipoPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [coches, equipos] = await Promise.all([
    prisma.cocheEquipo.findMany({
      orderBy: [{ activo: 'desc' }, { creadoEn: 'desc' }],
      include: {
        temporadas: { select: { id: true, numero: true, anio: true, activa: true }, orderBy: [{ anio: 'desc' }, { numero: 'desc' }] },
        skins: { select: { equipoId: true, imagenSkin: true, colorPrimario: true } },
      },
    }),
    prisma.equipo.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true, colorPrimario: true },
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Garaje de Equipo</h1>
        <p className="text-apex-muted mt-1">Coches de la liga por equipos (independientes del garaje individual) y skins de cada equipo.</p>
      </div>
      <AdminGarajeEquipoClient
        coches={coches.map(c => ({ ...c, creadoEn: c.creadoEn.toISOString() }))}
        equipos={equipos}
      />
    </div>
  )
}
