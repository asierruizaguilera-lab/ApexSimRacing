import { getServerSession } from 'next-auth'
import { notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEquipoDetalle } from '@/lib/equipoDetalle'
import { USER_MINI_SELECT } from '@/lib/equipos'
import { esUltimoMesDeTemporada, getTemporadaActiva } from '@/lib/temporadas'
import { EquipoDetalleClient } from '@/components/equipos/EquipoDetalleClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const e = await prisma.equipo.findUnique({ where: { id: params.id }, select: { nombre: true } })
  return { title: e?.nombre ?? 'Equipo' }
}

export default async function EquipoPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id

  const equipo = await getEquipoDetalle(params.id)
  if (!equipo) notFound()

  const esMiembro = equipo.miembros.some(m => m.userId === userId)
  const esLider = equipo.liderId === userId

  const [mensajes, temporada, invitacionesPendientes] = await Promise.all([
    esMiembro
      ? prisma.mensajeEquipo.findMany({
          where: { equipoId: equipo.id },
          orderBy: { creadoEn: 'desc' },
          take: 100,
          include: { user: { select: USER_MINI_SELECT } },
        })
      : [],
    getTemporadaActiva(),
    esLider
      ? prisma.invitacionEquipo.findMany({
          where: { equipoId: equipo.id, estado: 'PENDIENTE' },
          include: { invitado: { select: { id: true, username: true } } },
        })
      : [],
  ])

  return (
    <EquipoDetalleClient
      equipo={{
        id: equipo.id,
        nombre: equipo.nombre,
        descripcion: equipo.descripcion,
        logoUrl: equipo.logoUrl,
        colorPrimario: equipo.colorPrimario,
        activo: equipo.activo,
        liderId: equipo.liderId,
        creadoEn: equipo.creadoEn.toISOString(),
        puntosMesActual: equipo.puntosMesActual,
        posicionMes: equipo.posicionMes,
        totalEquipos: equipo.totalEquipos,
        temporada: equipo.temporada?.etiqueta ?? null,
        miembros: equipo.miembros.map(m => ({
          userId: m.userId, rol: m.rol, fechaUnion: m.fechaUnion.toISOString(),
          puntosMes: m.puntosMes, puntosEquipo: m.puntosEquipo, user: m.user,
        })),
        historico: equipo.puntosMes.map(p => ({ mes: p.mes, anio: p.anio, puntos: p.puntos })),
        propuesta: equipo.propuesta
          ? { titulo: equipo.propuesta.titulo, estado: equipo.propuesta.estado, respuestaAdmin: equipo.propuesta.respuestaAdmin }
          : null,
      }}
      mensajes={mensajes.reverse().map(m => ({ ...m, creadoEn: m.creadoEn.toISOString() }))}
      invitacionesPendientes={invitacionesPendientes.map(i => ({ id: i.id, username: i.invitado.username }))}
      currentUserId={userId}
      esMiembro={esMiembro}
      esLider={esLider}
      ventanaPropuestas={!!temporada && esUltimoMesDeTemporada(temporada)}
    />
  )
}
