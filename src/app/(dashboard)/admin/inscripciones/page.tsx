import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { InscripcionesClient } from '@/components/admin/InscripcionesClient'

export const metadata = { title: 'Gestión de Inscripciones' }

export default async function AdminInscripcionesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const inscripciones = await prisma.inscripcion.findMany({
    orderBy: { fechaInscripcion: 'desc' },
    include: {
      user: { select: { id: true, username: true, email: true, pais: true } },
      campeonato: { select: { id: true, nombre: true, disciplina: true } },
    },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Gestión de Inscripciones</h1>
        <p className="text-apex-muted mt-1">Confirma o cancela las solicitudes de inscripción de los pilotos</p>
      </div>
      <InscripcionesClient
        inscripciones={inscripciones.map(i => ({
          ...i,
          fechaInscripcion: i.fechaInscripcion.toISOString(),
        }))}
      />
    </div>
  )
}
