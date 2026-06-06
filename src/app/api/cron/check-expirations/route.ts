import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { activarPlan } from '@/lib/suscripciones'
import type { PlanSuscripcion } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verificar secreto del cron
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const now = new Date()
  let procesadas = 0

  // Buscar suscripciones con fechaExpiracionManual pasada
  const expiradas = await prisma.suscripcion.findMany({
    where: {
      estado: { in: ['ACTIVA', 'GRATUITA'] },
      fechaExpiracionManual: { lt: now, not: null },
    },
  })

  for (const sub of expiradas) {
    if (sub.planAnterior) {
      // Restaurar plan anterior
      await activarPlan(sub.userId, sub.planAnterior as PlanSuscripcion, {
        notasAdmin: 'Restaurado automáticamente por expiración de acceso manual',
      })
    } else {
      // Sin plan anterior: marcar como expirada
      await prisma.suscripcion.update({
        where: { id: sub.id },
        data: { estado: 'EXPIRADA', fechaCancelacion: now },
      })
      await prisma.notificacion.create({
        data: {
          userId: sub.userId,
          tipo: 'SUSCRIPCION_CANCELADA',
          mensaje: 'Tu acceso especial ha expirado. Activa un plan para seguir compitiendo.',
          link: '/',
        },
      })
    }
    procesadas++
  }

  console.log(`[Cron] check-expirations: ${procesadas} suscripciones procesadas`)
  return NextResponse.json({ ok: true, procesadas })
}
