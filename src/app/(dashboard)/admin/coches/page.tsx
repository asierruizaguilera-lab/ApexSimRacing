import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminCochesClient } from '@/components/admin/AdminCochesClient'

export const metadata = { title: 'Gestión de Coches' }

export default async function AdminCochesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const coches = await prisma.coche.findMany({
    orderBy: [{ planMinimo: 'asc' }, { disciplina: 'asc' }],
    include: { _count: { select: { desbloqueos: true } } },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Coches</h1>
        <p className="text-apex-muted mt-1">Administra el catálogo de coches desbloqueables por plan</p>
      </div>
      <AdminCochesClient coches={coches.map(c => ({
        ...c,
        creadoEn: undefined as any,
        _count: c._count,
      }))} />
    </div>
  )
}
