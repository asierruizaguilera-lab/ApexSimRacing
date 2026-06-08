import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PAISES } from '@/lib/utils'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      bio: true,
      pais: true,
      avatar: true,
      suscripcion: { select: { plan: true, estado: true } },
    },
  })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const userId = session.user.id
  let username: string | undefined
  let bio: string | undefined
  let pais: string | undefined
  let avatarUrl: string | undefined

  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    username = formData.get('username') as string | undefined
    bio = formData.get('bio') as string | undefined
    pais = formData.get('pais') as string | undefined

    const file = formData.get('avatar') as File | null
    if (file && file.size > 0) {
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 })
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif']
      if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Formato de imagen no permitido' }, { status: 400 })
      }
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const avatarsDir = path.join(process.cwd(), 'public', 'avatars')
      fs.mkdirSync(avatarsDir, { recursive: true })
      const filename = `${userId}.${ext}`
      fs.writeFileSync(path.join(avatarsDir, filename), buffer)
      avatarUrl = `/avatars/${filename}`
    }
  } else {
    const body = await req.json()
    username = body.username
    bio = body.bio
    pais = body.pais
    avatarUrl = body.avatar
  }

  // Validaciones
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'El username debe tener entre 3 y 20 caracteres' }, { status: 400 })
    }
    const existing = await prisma.user.findFirst({
      where: { username, NOT: { id: userId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Ese username ya está en uso' }, { status: 409 })
    }
  }

  if (bio !== undefined && bio !== null) {
    if (bio.length > 300) {
      return NextResponse.json({ error: 'La bio no puede superar 300 caracteres' }, { status: 400 })
    }
  }

  if (pais !== undefined && pais !== null && pais !== '') {
    if (!Object.keys(PAISES).includes(pais)) {
      return NextResponse.json({ error: 'País no válido' }, { status: 400 })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (username !== undefined) updateData.username = username
  if (bio !== undefined) updateData.bio = bio
  if (pais !== undefined) updateData.pais = pais || null
  if (avatarUrl !== undefined) updateData.avatar = avatarUrl

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, username: true, bio: true, pais: true, avatar: true },
  })

  return NextResponse.json(updated)
}
