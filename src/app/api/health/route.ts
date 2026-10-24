import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Health check para Render / monitorización. No expone versiones, variables ni detalles del error.
export async function GET() {
  const inicio = Date.now()
  let db = false
  try {
    await prisma.$queryRaw`SELECT 1`
    db = true
  } catch {}
  return NextResponse.json(
    { ok: db, db: db ? 'ok' : 'error', uptimeS: Math.round(process.uptime()), latenciaMs: Date.now() - inicio },
    { status: db ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  )
}
