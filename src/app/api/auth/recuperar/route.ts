import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarBody, z, email } from '@/lib/validacion'
import { LIMITES, consumir, respuesta429 } from '@/lib/rateLimit'
import { datosCliente, logActividad } from '@/lib/actividad'
import { enviarEmailRecuperacion } from '@/lib/tokensSeguridad'

const Esquema = z.object({ email })

// Solicitar enlace para restablecer la contraseña. Responde lo mismo exista o no la cuenta (no revela emails).
export async function POST(req: NextRequest) {
  const cliente = datosCliente(req)
  const claveRate = `recuperar:${cliente.ip ?? '?'}`
  if (consumir(claveRate, LIMITES.recuperar)) {
    return respuesta429(claveRate, 'rate_limit_recuperar', { ruta: '/api/auth/recuperar', ...cliente })
  }

  const v = await validarBody(req, Esquema)
  if (!v.ok) return v.res

  const envioDisponible = !!process.env.RESEND_API_KEY
  const user = await prisma.user.findFirst({
    where: { email: { equals: v.data.email, mode: 'insensitive' }, eliminadoEn: null },
    select: { id: true, email: true, username: true },
  })
  if (user && envioDisponible) {
    await enviarEmailRecuperacion(user).catch(err => console.error('[Recuperar]', err))
    logActividad({ tipo: 'SEGURIDAD', userId: user.id, ruta: '/api/auth/recuperar', ...cliente, detalle: { motivo: 'recuperacion_solicitada' } })
  }

  return NextResponse.json({ ok: true, envioDisponible })
}
