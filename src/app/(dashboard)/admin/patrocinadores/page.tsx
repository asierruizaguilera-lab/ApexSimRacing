import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Handshake } from 'lucide-react'
import { AdminPatrocinadoresClient } from '@/components/admin/AdminPatrocinadoresClient'

export const metadata = { title: 'Patrocinadores — Admin' }

export default async function AdminPatrocinadoresPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const patrocinadores = await prisma.patrocinador.findMany({
    orderBy: [{ orden: 'asc' }, { creadoEn: 'asc' }],
  })

  const serialized = patrocinadores.map(p => ({
    ...p,
    creadoEn: p.creadoEn.toISOString(),
    actualizadoEn: p.actualizadoEn.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-apex-red/10 border border-apex-red/30 rounded-xl flex items-center justify-center">
          <Handshake size={24} className="text-apex-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Patrocinadores</h1>
          <p className="text-apex-muted text-sm">Gestiona los patrocinadores de APEX SimRacing</p>
        </div>
      </div>

      <AdminPatrocinadoresClient initial={serialized as any} />
    </div>
  )
}
