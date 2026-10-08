import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { liquidarReferidor } from '@/lib/referidos'

export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const liquidacion = await liquidarReferidor(session.user.id, params.userId)
  if (!liquidacion) return NextResponse.json({ error: 'No hay saldo pendiente que liquidar' }, { status: 400 })

  return NextResponse.json(liquidacion)
}
