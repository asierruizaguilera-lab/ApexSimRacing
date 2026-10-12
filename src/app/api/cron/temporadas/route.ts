import { NextRequest, NextResponse } from 'next/server'
import { cerrarTemporadaSiTerminada } from '@/lib/temporadas'
import { cerrarVentanasExpiradas } from '@/lib/iniciacion'

export const dynamic = 'force-dynamic'

// Llamado por el cron diario (23:59 Madrid) de server.js: cierra la temporada activa en su último día
// y las ventanas Founder de iniciación ya expiradas
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resultado = await cerrarTemporadaSiTerminada()
  const ventanas = await cerrarVentanasExpiradas().catch(err => {
    console.error('[CRON] Error cerrando ventanas Founder:', err)
    return { ventanasCerradas: [] as string[], error: true }
  })
  return NextResponse.json({ ...resultado, ...ventanas })
}
