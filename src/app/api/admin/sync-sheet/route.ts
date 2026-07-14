import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncCarrerasDesdeSheet } from '@/lib/syncSheet'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const resultado = await syncCarrerasDesdeSheet('MANUAL')
  return NextResponse.json(resultado)
}
