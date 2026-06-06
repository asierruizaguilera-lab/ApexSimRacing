import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json(null, { status: 401 })

  const suscripcion = await prisma.suscripcion.findFirst({
    where: { userId: session.user.id, estado: 'ACTIVA' },
  })

  return NextResponse.json(suscripcion)
}
