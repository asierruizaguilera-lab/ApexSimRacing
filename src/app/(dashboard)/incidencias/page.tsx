import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { IncidenciasClient } from '@/components/incidencias/IncidenciasClient'

export const metadata = { title: 'Mis Incidencias' }

export default async function IncidenciasPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const quejas = await prisma.queja.findMany({
    where: { OR: [{ denuncianteId: session.user.id }, { denunciadoId: session.user.id }] },
    orderBy: { creadoEn: 'desc' },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: { select: { id: true, nombre: true, campeonato: { select: { id: true, nombre: true } } } },
      _count: { select: { pruebas: true } },
    },
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Incidencias</h1>
          <p className="text-apex-muted mt-1">Quejas que has presentado o en las que estás implicado</p>
        </div>
      </div>
      <IncidenciasClient
        quejas={quejas.map(q => ({ ...q, creadoEn: q.creadoEn.toISOString() }))}
        userId={session.user.id}
      />
    </div>
  )
}
