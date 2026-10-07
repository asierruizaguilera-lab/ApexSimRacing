import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { contarNoLeidos } from '@/lib/mensajes'

export const dynamic = 'force-dynamic'

// Total de mensajes directos sin leer (badge de la sidebar)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ total: 0 }, { status: 401 })
  return NextResponse.json({ total: await contarNoLeidos(session.user.id) })
}
