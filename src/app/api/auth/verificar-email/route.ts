import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarBody, z } from '@/lib/validacion'
import { consumirToken } from '@/lib/tokensSeguridad'
import { logActividad } from '@/lib/actividad'

const Esquema = z.object({ token: z.string().max(100) })

// Confirmar el email con el token del enlace (POST desde la página /verificar-email, no GET: los
// escáneres de enlaces de los clientes de correo no lo consumen solo por abrirlo)
export async function POST(req: NextRequest) {
  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res

  const userId = await consumirToken(v.data.token, 'VERIFICAR_EMAIL')
  if (!userId) return NextResponse.json({ error: 'El enlace no es válido o ha caducado. Pide uno nuevo desde tu perfil.' }, { status: 400 })

  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } })
  logActividad({ tipo: 'SEGURIDAD', userId, ruta: '/api/auth/verificar-email', detalle: { motivo: 'email_verificado' } })
  return NextResponse.json({ ok: true })
}
