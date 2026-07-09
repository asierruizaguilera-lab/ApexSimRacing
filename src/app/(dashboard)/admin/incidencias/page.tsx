import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminIncidenciasClient } from '@/components/admin/AdminIncidenciasClient'

export const metadata = { title: 'Gestión de Incidencias' }

export default async function AdminIncidenciasPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const quejas = await prisma.queja.findMany({
    orderBy: { creadoEn: 'desc' },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: { select: { id: true, nombre: true, campeonato: { select: { id: true, nombre: true } } } },
      pruebas: {
        orderBy: { creadoEn: 'asc' },
        include: { user: { select: { id: true, username: true } } },
      },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Incidencias</h1>
        <p className="text-apex-muted mt-1">Revisa quejas e incidencias y aplica resoluciones y sanciones</p>
      </div>
      <AdminIncidenciasClient
        quejas={quejas.map(q => ({
          ...q,
          creadoEn: q.creadoEn.toISOString(),
          fechaResolucion: q.fechaResolucion?.toISOString() || null,
          pruebas: q.pruebas.map(p => ({ ...p, creadoEn: p.creadoEn.toISOString() })),
        }))}
      />
    </div>
  )
}
