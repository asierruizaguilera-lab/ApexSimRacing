import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { validarBody, z, password } from '@/lib/validacion'
import { LIMITES, consumir, respuesta429 } from '@/lib/rateLimit'
import { datosCliente, logActividad } from '@/lib/actividad'
import { consumirToken } from '@/lib/tokensSeguridad'

const Esquema = z.object({ token: z.string().max(100), password })

// Fijar nueva contraseña con el token del email. Invalida las sesiones abiertas (passwordCambiadoEn).
export async function POST(req: NextRequest) {
  const cliente = datosCliente(req)
  const claveRate = `restablecer:${cliente.ip ?? '?'}`
  if (consumir(claveRate, { max: 10, ventanaMs: LIMITES.recuperar.ventanaMs })) {
    return respuesta429(claveRate, 'rate_limit_restablecer', { ruta: '/api/auth/restablecer', ...cliente })
  }

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res

  const userId = await consumirToken(v.data.token, 'RECUPERAR_PASSWORD')
  if (!userId) return NextResponse.json({ error: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' }, { status: 400 })

  await prisma.user.update({
    where: { id: userId },
    // Quien recibe el enlace en su bandeja demuestra que controla el email
    data: { password: await bcrypt.hash(v.data.password, 12), passwordCambiadoEn: new Date(), emailVerified: new Date() },
  })
  logActividad({ tipo: 'SEGURIDAD', userId, ruta: '/api/auth/restablecer', ...cliente, detalle: { motivo: 'password_restablecida' } })

  return NextResponse.json({ ok: true })
}
