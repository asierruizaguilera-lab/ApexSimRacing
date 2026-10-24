import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Los endpoints /api/cron/* exigen CRON_SECRET (cabecera x-cron-secret o ?secret=). Si la variable no
 * está configurada responden 503 en vez de quedar abiertos. Devuelve la respuesta de error o null si pasa.
 */
export function rechazarCron(req: NextRequest): NextResponse | null {
  const esperado = process.env.CRON_SECRET
  if (!esperado) return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
  const recibido = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || ''
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}
