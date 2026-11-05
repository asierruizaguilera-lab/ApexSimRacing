import { NextRequest, NextResponse } from 'next/server'
import { rechazarCron } from '@/lib/cron'
import { parseRoundSchedule } from '@/lib/avisos/decision'
import { ejecutarAvisos } from '@/lib/avisos/enviar'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rechazo = rechazarCron(req)
  if (rechazo) return rechazo
  try {
    const { rondas, error } = parseRoundSchedule(process.env.ROUND_SCHEDULE)
    const dry = req.nextUrl.searchParams.get('dry') === '1'
    const queryAhora = req.nextUrl.searchParams.get('ahora')
    const ahoraPrueba = dry && queryAhora ? new Date(queryAhora) : null
    const ahora = ahoraPrueba && !Number.isNaN(ahoraPrueba.getTime()) ? ahoraPrueba : new Date()
    const resumen = await ejecutarAvisos({ ahora, dry, rondas })
    return NextResponse.json({ ...resumen, ...(error ? { errorSchedule: error } : {}) })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
