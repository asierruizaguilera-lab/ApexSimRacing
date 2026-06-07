import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  await prisma.claseVista.upsert({
    where: { userId_claseId: { userId: session.user.id, claseId: params.id } },
    update: {},
    create: { userId: session.user.id, claseId: params.id },
  })

  return NextResponse.json({ ok: true })
}
