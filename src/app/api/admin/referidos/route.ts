import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { crearCodigoParaUsuario, getResumenAdminReferidos } from '@/lib/referidos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  return NextResponse.json(await getResumenAdminReferidos())
}

// Crear un código manualmente para cualquier usuario (por id o username)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { userId, username } = await req.json()
  if (!userId && !username) return NextResponse.json({ error: 'Indica un usuario' }, { status: 400 })

  const user = await prisma.user.findFirst({
    where: userId ? { id: userId } : { username: { equals: String(username).trim(), mode: 'insensitive' } },
    select: { id: true, username: true },
  })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const codigo = await crearCodigoParaUsuario(user.id)
  await prisma.logAccionAdmin.create({
    data: {
      adminId: session.user.id,
      targetUserId: user.id,
      accion: 'CODIGO_REFERIDO',
      detalle: `Código ${codigo.codigo} creado por admin`,
    },
  })
  return NextResponse.json(codigo, { status: 201 })
}
