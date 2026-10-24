import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailPendienteDeVerificar, enviarEmailVerificacion, verificacionEmailActiva } from '@/lib/tokensSeguridad'
import { LIMITES, consumir, respuesta429 } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

async function usuario(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, username: true, emailVerified: true, fechaRegistro: true, role: true },
  })
}

// Estado de la verificación de email del usuario (banner del dashboard)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const user = await usuario(session.user.id)
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json({ activa: verificacionEmailActiva(), pendiente: emailPendienteDeVerificar(user) })
}

// Reenviar el enlace de verificación (5 por hora)
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const claveRate = `verificacion:${session.user.id}`
  if (consumir(claveRate, LIMITES.recuperar)) return respuesta429(claveRate, 'rate_limit_verificacion', { ruta: '/api/perfil/verificacion' })

  const user = await usuario(session.user.id)
  if (!user) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (!emailPendienteDeVerificar(user)) return NextResponse.json({ ok: true, yaVerificado: true })

  const enviado = await enviarEmailVerificacion(user)
  if (!enviado) return NextResponse.json({ error: 'No se pudo enviar el email. Inténtalo más tarde.' }, { status: 503 })
  return NextResponse.json({ ok: true })
}
