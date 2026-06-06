import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminSuscriptoresClient } from '@/components/admin/AdminSuscriptoresClient'

export const metadata = { title: 'Gestión de Suscriptores' }

export default async function AdminSuscriptoresPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [suscripciones, statsRaw] = await Promise.all([
    prisma.suscripcion.findMany({
      orderBy: { fechaInicio: 'desc' },
      include: {
        user: { select: { id: true, username: true, email: true, pais: true } },
      },
    }),
    prisma.suscripcion.groupBy({
      by: ['plan'],
      where: { estado: 'ACTIVA' },
      _count: { id: true },
    }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Suscriptores</h1>
        <p className="text-apex-muted mt-1">Administra los planes activos y estadísticas de ingresos</p>
      </div>
      <AdminSuscriptoresClient
        suscripciones={suscripciones.map(s => ({
          ...s,
          fechaInicio: s.fechaInicio.toISOString(),
          fechaRenovacion: s.fechaRenovacion.toISOString(),
          fechaCancelacion: s.fechaCancelacion?.toISOString() ?? null,
          creadoEn: s.creadoEn.toISOString(),
        }))}
        stats={statsRaw.map(s => ({ plan: s.plan, _count: { id: s._count.id } }))}
      />
    </div>
  )
}
