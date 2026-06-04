import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { PerfilClient } from '@/components/perfil/PerfilClient'

export default async function PerfilPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  const piloto = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      resultados: {
        orderBy: { creadoEn: 'desc' },
        include: {
          carrera: {
            include: { campeonato: { select: { id: true, nombre: true, disciplina: true } } },
          },
        },
      },
      inscripciones: {
        where: { estado: 'CONFIRMADA' },
        include: { campeonato: { select: { id: true, nombre: true, disciplina: true, estado: true } } },
      },
    },
  })

  if (!piloto) notFound()

  // Ranking global
  const rankingGlobal = await prisma.user.count({
    where: { role: 'PILOTO', totalPuntos: { gt: piloto.totalPuntos } },
  }) + 1

  // Puntos por carrera para el gráfico (últimas 10)
  const chartData = piloto.resultados.slice(0, 10).reverse().map(r => ({
    nombre: r.carrera.nombre.split('—')[0].trim().substring(0, 15),
    puntos: r.puntos,
  }))

  const isOwn = session?.user?.id === params.id

  return (
    <PerfilClient
      piloto={{
        ...piloto,
        fechaRegistro: piloto.fechaRegistro.toISOString(),
        resultados: piloto.resultados.map(r => ({
          id: r.id,
          posicion: r.posicion,
          puntos: r.puntos,
          vueltaRapida: r.vueltaRapida,
          abandono: r.abandono,
          tiempo: r.tiempo,
          creadoEn: r.creadoEn.toISOString(),
          carrera: {
            id: r.carreraId,
            nombre: r.carrera.nombre,
            circuito: r.carrera.circuito,
            campeonato: r.carrera.campeonato,
          },
        })),
        inscripciones: piloto.inscripciones.map(i => ({
          campeonato: i.campeonato,
        })),
      }}
      rankingGlobal={rankingGlobal}
      chartData={chartData}
      isOwn={isOwn}
    />
  )
}
