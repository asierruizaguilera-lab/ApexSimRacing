import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getResumenAdminReferidos } from '@/lib/referidos'
import { AdminReferidosClient } from '@/components/admin/AdminReferidosClient'

export const metadata = { title: 'Programa de Referidos' }
export const dynamic = 'force-dynamic'

export default async function AdminReferidosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const resumen = await getResumenAdminReferidos()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Programa de Referidos</h1>
        <p className="text-apex-muted mt-1">Códigos, comisiones pendientes y liquidaciones mensuales</p>
      </div>
      <AdminReferidosClient inicial={resumen} />
    </div>
  )
}
