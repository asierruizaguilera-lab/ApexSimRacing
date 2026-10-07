import { NextRequest, NextResponse } from 'next/server'
import { cerrarTemporadaSiTerminada } from '@/lib/temporadas'

export const dynamic = 'force-dynamic'

// Llamado por el cron semanal de server.js: cierra la temporada activa si ya terminó
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resultado = await cerrarTemporadaSiTerminada()
  return NextResponse.json(resultado)
}
