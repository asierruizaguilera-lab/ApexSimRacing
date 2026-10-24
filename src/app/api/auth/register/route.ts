import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailBienvenida } from '@/lib/email'
import { buscarCodigoValido } from '@/lib/referidos'
import { validarBody, z, email as emailSchema, password as passwordSchema } from '@/lib/validacion'
import { LIMITES, consumir, respuesta429 } from '@/lib/rateLimit'
import { enviarEmailVerificacion } from '@/lib/tokensSeguridad'
import { PAISES } from '@/lib/utils'

const Registro = z.object({
  username: z.string().trim().min(3, 'El nombre de usuario debe tener entre 3 y 20 caracteres').max(20, 'El nombre de usuario debe tener entre 3 y 20 caracteres'),
  email: emailSchema,
  password: passwordSchema,
  pais: z.string().max(4).optional().nullable().refine(p => !p || p in PAISES, 'País no válido'),
  codigoReferido: z.string().max(40).optional().nullable(),
  aceptaTerminos: z.literal(true, { errorMap: () => ({ message: 'Debes aceptar los términos y la política de privacidad' }) }),
})
import { logActividad, datosCliente } from '@/lib/actividad'

export async function POST(req: NextRequest) {
  // 5 registros por hora y por IP
  const cliente = datosCliente(req)
  const claveRate = `registro:${cliente.ip ?? '?'}`
  if (consumir(claveRate, LIMITES.registro)) {
    return respuesta429(claveRate, 'rate_limit_registro', { ruta: '/api/auth/register', ...cliente })
  }

  try {
    const v = await validarBody(req, Registro)
    if (!v.ok) return v.res
    const { username, email, password, pais, codigoReferido } = v.data

    const existingEmail = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } })
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
        pais: pais || null,
        role: 'PILOTO',
        // Se vincula con el referidor (UsoReferido) al completar el primer pago
        descuentoReferido: !!codigoReferidoId,
        codigoReferidoPendienteId: codigoReferidoId,
      },
      select: { id: true, username: true, email: true, role: true },
    })

    logActividad({
      tipo: 'REGISTRO',
      userId: user.id,
      ruta: '/api/auth/register',
      metodo: 'POST',
      estado: 201,
      ...cliente,
      detalle: { conReferido: !!codigoReferidoId },
    })

    // Sin RESEND_API_KEY no hace nada (y la verificación queda desactivada)
    enviarEmailVerificacion(user).catch(err => console.error('[Register] email verificación', err))

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
