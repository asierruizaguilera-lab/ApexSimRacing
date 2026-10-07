import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listarEquiposAdmin } from '@/lib/equipos'

export const dynamic = 'force-dynamic'

// Todos los equipos (activos y disueltos) con miembros y puntos del mes
export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  return NextResponse.json(await listarEquiposAdmin())
}
