import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminResultadosClient } from '@/components/admin/AdminResultadosClient'

export default async function AdminResultadosPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const carrera = await prisma.carrera.findUnique({
    where: { id: params.id },
    include: {
      campeonato: {
        include: {
          inscripciones: {
            where: { estado: 'CONFIRMADA' },
            include: { user: { select: { id: true, username: true, pais: true } } },
          },
        },
      },
      resultados: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  })

  if (!carrera) notFound()

  return (
    <AdminResultadosClient
      carrera={{
        ...carrera,
        fecha: carrera.fecha.toISOString(),
        resultados: carrera.resultados.map(r => ({ ...r, creadoEn: r.creadoEn.toISOString() })),
      }}
    />
  )
}
