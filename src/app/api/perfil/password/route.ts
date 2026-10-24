import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarBody, z, password } from '@/lib/validacion'

const Esquema = z.object({
  actual: z.string().min(1, 'Rellena todos los campos').max(200),
  nueva: password,
  confirmar: z.string().max(200),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res
  const { actual, nueva, confirmar } = v.data

  if (nueva !== confirmar) {
    return NextResponse.json({ error: 'Las nuevas contraseñas no coinciden' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (!user.password) {
    return NextResponse.json({ error: 'Tu cuenta no tiene contraseña configurada' }, { status: 400 })
  }

  const valida = await bcrypt.compare(actual, user.password)
  if (!valida) return NextResponse.json({ error: 'La contraseña actual es incorrecta' }, { status: 400 })

  if (await bcrypt.compare(nueva, user.password)) {
    return NextResponse.json({ error: 'La nueva contraseña debe ser distinta de la actual' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: await bcrypt.hash(nueva, 12) },
  })

  return NextResponse.json({ ok: true })
}
