import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { esUltimoMesDeTemporada, getTemporadaActiva } from '@/lib/temporadas'
import { AdminPropuestasClient } from '@/components/admin/AdminPropuestasClient'

export const metadata = { title: 'Propuestas de equipos' }
export const dynamic = 'force-dynamic'

export default async function AdminPropuestasPage() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') redirect('/dashboard')

  const [propuestas, temporada] = await Promise.all([
    prisma.propuestaEquipo.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        equipo: { select: { id: true, nombre: true, colorPrimario: true } },
        lider: { select: { id: true, username: true } },
        temporada: { select: { numero: true, anio: true } },
      },
    }),
    getTemporadaActiva(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Propuestas de equipos</h1>
        <p className="text-apex-muted mt-1">
          Los líderes pueden enviar una propuesta por temporada, solo durante su último mes.{' '}
          {temporada && (esUltimoMesDeTemporada(temporada)
            ? <span className="text-green-400">La ventana de propuestas de T{temporada.numero} {temporada.anio} está abierta.</span>
            : <span>La ventana de T{temporada.numero} {temporada.anio} se abrirá en su último mes.</span>)}
        </p>
      </div>
      <AdminPropuestasClient
        propuestas={propuestas.map(p => ({
          ...p,
          creadoEn: p.creadoEn.toISOString(),
          respondidoEn: p.respondidoEn?.toISOString() ?? null,
        }))}
      />
    </div>
  )
}
