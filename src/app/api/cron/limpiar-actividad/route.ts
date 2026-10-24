import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rechazarCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

// Retención del log de actividad: vistas 90 días, el resto 12 meses
export async function GET(req: NextRequest) {
  const rechazo = rechazarCron(req)
  if (rechazo) return rechazo

  const hace90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const hace12m = new Date()
  hace12m.setMonth(hace12m.getMonth() - 12)

  const [vistas, resto] = await Promise.all([
    prisma.logActividad.deleteMany({ where: { tipo: 'VISTA', creadoEn: { lt: hace90d } } }),
    prisma.logActividad.deleteMany({ where: { tipo: { not: 'VISTA' }, creadoEn: { lt: hace12m } } }),
  ])

  console.log(`[Cron] limpiar-actividad: ${vistas.count} vistas y ${resto.count} otros borrados`)
  return NextResponse.json({ ok: true, vistas: vistas.count, resto: resto.count })
}
