import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { listarEquiposAdmin } from '@/lib/equipos'
import { AdminEquiposClient } from '@/components/admin/AdminEquiposClient'

export const metadata = { title: 'Gestión de Equipos' }
export const dynamic = 'force-dynamic'

export default async function AdminEquiposPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const equipos = await listarEquiposAdmin()
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <p className="text-apex-muted mt-1">Estado, miembros y puntos del mes. Disuelve equipos, cambia líderes o modera su chat.</p>
      </div>
      <AdminEquiposClient equipos={equipos} adminId={session.user.id} />
    </div>
  )
}
