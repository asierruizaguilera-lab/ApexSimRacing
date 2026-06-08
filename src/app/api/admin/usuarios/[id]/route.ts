import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { darAccesoManual, banearUsuario, desbanearUsuario } from '@/lib/suscripciones'
import type { PlanSuscripcion } from '@prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Usar session.user.id directamente — ya está verificado en el JWT
  const adminId = session.user.id
  const userId = params.id

  const body = await req.json()
  const { accion, plan, esGratuita, fechaExpiracion, notas, baneado, motivoBan } = body

  switch (accion) {
    case 'CAMBIO_PLAN': {
      const validPlans: PlanSuscripcion[] = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']
      if (!validPlans.includes(plan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
      await darAccesoManual(
        adminId,
        userId,
        plan as PlanSuscripcion,
        fechaExpiracion ? new Date(fechaExpiracion) : undefined,
        notas
      )
      break
    }
    case 'BAN': {
      if (baneado) {
        await banearUsuario(adminId, userId, motivoBan || 'Sin motivo especificado')
      } else {
        await desbanearUsuario(adminId, userId)
      }
      break
    }
    case 'NOTA': {
      await prisma.suscripcion.updateMany({
        where: { userId },
        data: { notasAdmin: notas },
      })
      try {
        await prisma.logAccionAdmin.create({
          data: { adminId, targetUserId: userId, accion: 'NOTA', detalle: notas },
        })
      } catch (logErr) {
        console.error('[Admin] Log NOTA falló (no crítico):', logErr)
      }
      break
    }
    case 'CANCELAR_SUSCRIPCION': {
      await prisma.suscripcion.updateMany({
        where: { userId, estado: { in: ['ACTIVA', 'GRATUITA'] } },
        data: { estado: 'CANCELADA', fechaCancelacion: new Date() },
      })
      try {
        await prisma.logAccionAdmin.create({
          data: { adminId, targetUserId: userId, accion: 'CANCELAR_SUSCRIPCION', detalle: notas },
        })
      } catch (logErr) {
        console.error('[Admin] Log CANCELAR falló (no crítico):', logErr)
      }
      break
    }
    default:
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const [user, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: { suscripcion: true },
    }),
    prisma.logAccionAdmin.findMany({
      where: { targetUserId: params.id },
      orderBy: { creadoEn: 'desc' },
      take: 20,
      include: { admin: { select: { username: true } } },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json({ user, logs })
}
