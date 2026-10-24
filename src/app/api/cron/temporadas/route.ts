import { NextRequest, NextResponse } from 'next/server'
import { cerrarTemporadaSiTerminada } from '@/lib/temporadas'
import { cerrarVentanasExpiradas } from '@/lib/iniciacion'
import { rechazarCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

// Llamado por el cron diario (23:59 Madrid) de server.js: cierra la temporada activa en su último día
// y las ventanas Founder de iniciación ya expiradas
export async function GET(req: NextRequest) {
  const rechazo = rechazarCron(req)
  if (rechazo) return rechazo

  const resultado = await cerrarTemporadaSiTerminada()
  const ventanas = await cerrarVentanasExpiradas().catch(err => {
    console.error('[CRON] Error cerrando ventanas Founder:', err)
    return { ventanasCerradas: [] as string[], error: true }
  })
  return NextResponse.json({ ...resultado, ...ventanas })
}
