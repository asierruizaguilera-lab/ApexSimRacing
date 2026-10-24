import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // updateMany con el userId: una notificación ajena da 404 en vez de un error 500
  const { count } = await prisma.notificacion.updateMany({
    where: { id: params.id, userId: session.user.id },
    data: { leida: true },
  })
  if (count === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
