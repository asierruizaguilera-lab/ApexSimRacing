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
            include: { campeonato: { select: { id: true, nombre: true, disciplina: true, esIniciacion: true } } },
          },
        },
      },
      inscripciones: {
        where: { estado: 'CONFIRMADA' },
        include: { campeonato: { select: { id: true, nombre: true, disciplina: true, estado: true } } },
      },
      suscripcion: { select: { plan: true, estado: true } },
    },
  })

  if (!piloto) notFound()

  const rankingGlobal = await prisma.user.count({
    where: { role: 'PILOTO', totalPuntos: { gt: piloto.totalPuntos } },
  }) + 1

  // Los resultados de la temporada de iniciación van en una sección aparte (no cuentan para el ranking)
  const esDeIniciacion = (r: (typeof piloto.resultados)[number]) => r.esIniciacion || r.carrera.campeonato.esIniciacion
  const resultadosPrincipales = piloto.resultados.filter(r => !esDeIniciacion(r))
  const resultadosIniciacion = piloto.resultados.filter(esDeIniciacion)
  const serializarResultado = (r: (typeof piloto.resultados)[number]) => ({
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
  })

  const chartData = resultadosPrincipales.slice(0, 10).reverse().map(r => ({
    nombre: r.carrera.nombre.split('—')[0].trim().substring(0, 15),
    puntos: r.puntos,
  }))

  const isOwn = session?.user?.id === params.id

  return (
    <PerfilClient
      piloto={{
        ...piloto,
        fechaRegistro: piloto.fechaRegistro.toISOString(),
        suscripcion: piloto.suscripcion,
        resultados: resultadosPrincipales.map(serializarResultado),
        resultadosIniciacion: resultadosIniciacion.map(serializarResultado),
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
