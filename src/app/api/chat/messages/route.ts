import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const canal = searchParams.get('canal') || 'GENERAL'
  const limit = parseInt(searchParams.get('limit') || '100')

  const mensajes = await prisma.mensajeChat.findMany({
    where: { canal: canal as any, eliminado: false },
    orderBy: { creadoEn: 'desc' },
    take: limit,
    include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
  })

  return NextResponse.json(mensajes.reverse())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contenido, canal } = await req.json()
  if (!contenido?.trim()) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
  if (contenido.length > 500) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  // Solo admins pueden escribir en ANUNCIOS
  if (canal === 'ANUNCIOS' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo los administradores pueden escribir en anuncios' }, { status: 403 })
  }

  // Verificar si está silenciado
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { silenciado: true, username: true, avatar: true, role: true } })
  if (user?.silenciado) return NextResponse.json({ error: 'Tu cuenta está silenciada' }, { status: 403 })

  const mensaje = await prisma.mensajeChat.create({
    data: {
      userId: session.user.id,
      canal: canal || 'GENERAL',
      contenido: contenido.trim(),
    },
    include: { user: { select: { id: true, username: true, avatar: true, role: true } } },
  })

  return NextResponse.json(mensaje, { status: 201 })
}
