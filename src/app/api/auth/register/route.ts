import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailBienvenida } from '@/lib/email'
import { buscarCodigoValido } from '@/lib/referidos'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password, pais, codigoReferido } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres' }, { status: 400 })
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Este nombre de piloto ya está en uso' }, { status: 409 })
    }

    // Código de referido opcional: si se envía, debe ser válido
    let codigoReferidoId: string | null = null
    if (typeof codigoReferido === 'string' && codigoReferido.trim()) {
      const codigo = await buscarCodigoValido(codigoReferido)
      if (!codigo) {
        return NextResponse.json({ error: 'El código de referido no es válido' }, { status: 400 })
      }
      codigoReferidoId = codigo.id
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        pais,
        role: 'PILOTO',
        // Se vincula con el referidor (UsoReferido) al completar el primer pago
        descuentoReferido: !!codigoReferidoId,
        codigoReferidoPendienteId: codigoReferidoId,
      },
      select: { id: true, username: true, email: true, role: true },
    })

    // Email de bienvenida (async, no bloquea el registro)
    sendEmail({
      to: user.email,
      subject: `Bienvenido a APEX, ${user.username} 🏁`,
      html: emailBienvenida(user.username),
    }).catch(() => null)

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('[Register]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
