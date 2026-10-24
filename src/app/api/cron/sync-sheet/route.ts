import { NextRequest, NextResponse } from 'next/server'
import { syncCarrerasDesdeSheet } from '@/lib/syncSheet'
import { rechazarCron } from '@/lib/cron'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rechazo = rechazarCron(req)
  if (rechazo) return rechazo

  const resultado = await syncCarrerasDesdeSheet('AUTOMATICA')
  return NextResponse.json(resultado)
}
