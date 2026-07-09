import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { IncidenciaDetalleClient } from '@/components/incidencias/IncidenciaDetalleClient'

export const metadata = { title: 'Detalle de Incidencia' }

export default async function IncidenciaDetallePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')

  const queja = await prisma.queja.findUnique({
    where: { id: params.id },
    include: {
      denunciante: { select: { id: true, username: true, avatar: true } },
      denunciado: { select: { id: true, username: true, avatar: true } },
      carrera: {
        select: { id: true, nombre: true, circuito: true, fecha: true, campeonato: { select: { id: true, nombre: true } } },
      },
      pruebas: {
        orderBy: { creadoEn: 'asc' },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  })
  if (!queja) notFound()

  const esParte = queja.denuncianteId === session.user.id || queja.denunciadoId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'
  if (!esParte && !isAdmin) redirect('/incidencias')

  let resueltaPorUsername: string | null = null
  if (queja.resueltaPor) {
    const admin = await prisma.user.findUnique({ where: { id: queja.resueltaPor }, select: { username: true } })
    resueltaPorUsername = admin?.username || null
  }

  return (
    <div className="max-w-3xl">
      <IncidenciaDetalleClient
        queja={{
          ...queja,
          creadoEn: queja.creadoEn.toISOString(),
          fechaResolucion: queja.fechaResolucion?.toISOString() || null,
          carrera: queja.carrera ? { ...queja.carrera, fecha: queja.carrera.fecha.toISOString() } : null,
          pruebas: queja.pruebas.map(p => ({ ...p, creadoEn: p.creadoEn.toISOString() })),
          resueltaPorUsername,
        }}
        userId={session.user.id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
