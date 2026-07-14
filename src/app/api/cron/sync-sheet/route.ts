import { NextRequest, NextResponse } from 'next/server'
import { syncCarrerasDesdeSheet } from '@/lib/syncSheet'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const resultado = await syncCarrerasDesdeSheet('AUTOMATICA')
  return NextResponse.json(resultado)
}
