import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { banearUsuario } from '@/lib/suscripciones'
import type { EstadoQueja, TipoSancion } from '@prisma/client'

const ESTADOS: EstadoQueja[] = ['ABIERTA', 'EN_REVISION', 'RESUELTA', 'ARCHIVADA']
const SANCIONES: TipoSancion[] = ['ADVERTENCIA', 'PENALIZACION_PUNTOS', 'EXCLUSION_CARRERA', 'SUSPENSION_TEMPORAL', 'BAN_PERMANENTE']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const existing = await prisma.queja.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  const { estado, resolucion, sancion, puntosPenalizados, diasSuspension } = await req.json()

  if (estado && !ESTADOS.includes(estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  if (sancion && !SANCIONES.includes(sancion)) return NextResponse.json({ error: 'Sanción inválida' }, { status: 400 })
  if (sancion && !existing.denunciadoId) {
    return NextResponse.json({ error: 'No se puede aplicar una sanción sin un usuario denunciado' }, { status: 400 })
  }

  const data: {
    estado?: EstadoQueja
    resolucion?: string
    sancion?: TipoSancion | null
    puntosPenalizados?: number | null
    diasSuspension?: number | null
    resueltaPor?: string
    fechaResolucion?: Date
  } = {}
  if (estado) data.estado = estado
  if (resolucion !== undefined) data.resolucion = resolucion
  if (sancion !== undefined) data.sancion = sancion || null
  if (puntosPenalizados !== undefined) data.puntosPenalizados = puntosPenalizados ? Number(puntosPenalizados) : null
  if (diasSuspension !== undefined) data.diasSuspension = diasSuspension ? Number(diasSuspension) : null

  if (estado === 'RESUELTA' || estado === 'ARCHIVADA') {
    data.resueltaPor = session.user.id
    data.fechaResolucion = new Date()
  }

  const queja = await prisma.queja.update({ where: { id: params.id }, data })

  // La sanción solo se aplica la primera vez que se establece, para no repetir el castigo en ediciones posteriores
  const esSancionNueva = sancion && !existing.sancion && existing.denunciadoId
  if (esSancionNueva) {
    const targetId = existing.denunciadoId!
    const detalle = resolucion || `Sanción por incidencia: ${existing.titulo}`

    if (sancion === 'BAN_PERMANENTE') {
      await banearUsuario(session.user.id, targetId, detalle)
    } else if (sancion === 'PENALIZACION_PUNTOS') {
      const target = await prisma.user.findUnique({ where: { id: targetId }, select: { totalPuntos: true } })
      const puntos = puntosPenalizados ? Number(puntosPenalizados) : 0
      await prisma.user.update({
        where: { id: targetId },
        data: { totalPuntos: Math.max(0, (target?.totalPuntos || 0) - puntos) },
      })
      await prisma.logAccionAdmin.create({
        data: { adminId: session.user.id, targetUserId: targetId, accion: 'SANCION_PUNTOS', detalle: `-${puntos} pts. ${detalle}` },
      })
    } else if (sancion === 'EXCLUSION_CARRERA' && existing.carreraId) {
      const carrera = await prisma.carrera.findUnique({ where: { id: existing.carreraId }, select: { campeonatoId: true } })
      if (carrera) {
        await prisma.inscripcion.updateMany({
          where: { userId: targetId, campeonatoId: carrera.campeonatoId },
          data: { estado: 'CANCELADA' },
        })
      }
      await prisma.logAccionAdmin.create({
        data: { adminId: session.user.id, targetUserId: targetId, accion: 'SANCION_EXCLUSION_CARRERA', detalle },
      })
    } else {
      await prisma.logAccionAdmin.create({
        data: { adminId: session.user.id, targetUserId: targetId, accion: `SANCION_${sancion}`, detalle },
      })
    }
  }

  return NextResponse.json(queja)
}
