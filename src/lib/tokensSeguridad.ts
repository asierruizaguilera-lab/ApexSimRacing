import { createHash, randomBytes } from 'crypto'
import type { TipoTokenSeguridad } from '@prisma/client'
import { prisma } from './prisma'
import { sendEmail, emailRecuperarPassword, emailVerificarEmail } from './email'

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

const DURACION_MS: Record<TipoTokenSeguridad, number> = {
  RECUPERAR_PASSWORD: 60 * 60 * 1000,
  VERIFICAR_EMAIL: 24 * 60 * 60 * 1000,
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Crea un token de un solo uso (en BD solo queda su hash) e invalida los anteriores del mismo tipo. */
export async function crearToken(userId: string, tipo: TipoTokenSeguridad): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await prisma.$transaction([
    prisma.tokenSeguridad.updateMany({ where: { userId, tipo, usadoEn: null }, data: { usadoEn: new Date() } }),
    prisma.tokenSeguridad.create({
      data: { userId, tipo, tokenHash: hashToken(token), expira: new Date(Date.now() + DURACION_MS[tipo]) },
    }),
  ])
  return token
}

/** Marca el token como usado y devuelve su userId, o null si no existe, caducó o ya se usó. */
export async function consumirToken(token: string, tipo: TipoTokenSeguridad): Promise<string | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null
  const registro = await prisma.tokenSeguridad.findFirst({
    where: { tokenHash: hashToken(token), tipo, usadoEn: null, expira: { gt: new Date() } },
  })
  if (!registro) return null
  // updateMany con la condición usadoEn: null evita que dos peticiones simultáneas usen el mismo token
  const { count } = await prisma.tokenSeguridad.updateMany({
    where: { id: registro.id, usadoEn: null },
    data: { usadoEn: new Date() },
  })
  return count === 1 ? registro.userId : null
}

// ── Verificación de email ──────────────────────────────────────────────────────────────────────

/** Sin Resend no se pueden mandar enlaces: la verificación se desactiva en vez de bloquear a nadie. */
export function verificacionEmailActiva(): boolean {
  return !!process.env.RESEND_API_KEY
}

// Las cuentas creadas antes de activar la verificación se consideran verificadas (no se tocan sus datos)
const VERIFICACION_DESDE = new Date(process.env.VERIFICACION_EMAIL_DESDE || '2026-10-25T00:00:00Z')

export function emailPendienteDeVerificar(user: { emailVerified: Date | null; fechaRegistro: Date; role?: string }): boolean {
  if (!verificacionEmailActiva()) return false
  if (user.role === 'ADMIN') return false
  if (user.emailVerified) return false
  return user.fechaRegistro >= VERIFICACION_DESDE
}

export async function usuarioDebeVerificarEmail(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, fechaRegistro: true, role: true },
  })
  return !!user && emailPendienteDeVerificar(user)
}

export const RESPUESTA_EMAIL_NO_VERIFICADO = {
  error: 'Confirma tu email antes de continuar. Te hemos enviado un enlace; puedes reenviarlo desde tu perfil.',
  code: 'EMAIL_NO_VERIFICADO',
}

export async function enviarEmailVerificacion(user: { id: string; email: string; username: string }): Promise<boolean> {
  if (!verificacionEmailActiva()) return false
  const token = await crearToken(user.id, 'VERIFICAR_EMAIL')
  return sendEmail({
    to: user.email,
    subject: 'Confirma tu email — APEX SimRacing',
    html: emailVerificarEmail(user.username, `${BASE_URL}/verificar-email?token=${token}`),
  })
}

export async function enviarEmailRecuperacion(user: { id: string; email: string; username: string }): Promise<boolean> {
  const token = await crearToken(user.id, 'RECUPERAR_PASSWORD')
  return sendEmail({
    to: user.email,
    subject: 'Restablecer contraseña — APEX SimRacing',
    html: emailRecuperarPassword(user.username, `${BASE_URL}/restablecer?token=${token}`),
  })
}
