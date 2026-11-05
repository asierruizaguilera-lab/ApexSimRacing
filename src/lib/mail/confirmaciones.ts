import { prisma } from '@/lib/prisma'
import { maskEmail } from './mask'
import { sendMail } from './index'

type Contenido = (u: { username: string }) => { subject: string; html: string }

// Nunca lanza: ni siquiera si referencia no es texto o si console falla
function etiqueta(referencia: unknown): string {
  return typeof referencia === 'string' ? referencia.split(':')[0] : 'desconocida'
}
function registrarError(referencia?: unknown): void {
  try { console.error(`[Mail] Error en confirmación ${etiqueta(referencia)}`) } catch { /* sin salida posible */ }
}

async function ejecutar(userId: string, referencia: string, contenido: Contenido): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } })
    if (!user) return
    // Siempre TRANSACCIONAL: quien llama no puede elegir otro tipo
    const r = await sendMail({ userId, tipo: 'TRANSACCIONAL', referencia, to: user.email, ...contenido(user) })
    if (r.estado === 'FALLIDO' || r.estado === 'DETENIDO') console.warn(`[Mail] Confirmación ${etiqueta(referencia)} a ${maskEmail(user.email)}: ${r.estado}${r.motivo ? ` (${r.motivo})` : ''}`)
  } catch {
    registrarError(referencia)
  }
}

/**
 * Confirmaciones (inscripción, plan activo, cancelación): TRANSACCIONAL, con EmailLog e idempotentes
 * por referencia. Ni bloquea ni lanza, y la promesa que devuelve nunca se rechaza: un fallo de email
 * no puede romper el flujo que la llama. Quien la llama no debe esperarla.
 */
export function enviarConfirmacion(userId: string, referencia: string, contenido: Contenido): Promise<void> {
  try {
    return ejecutar(userId, referencia, contenido).catch(() => registrarError(referencia))
  } catch {
    registrarError(referencia)
    return Promise.resolve()
  }
}
