import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminActividadClient } from '@/components/admin/AdminActividadClient'

export const metadata = { title: 'Log de Actividad' }

export default async function AdminActividadPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Log de Actividad</h1>
        <p className="text-apex-muted mt-1">Accesos, pagos, acciones de admin y errores de la plataforma</p>
      </div>
      <AdminActividadClient />
    </div>
  )
}
