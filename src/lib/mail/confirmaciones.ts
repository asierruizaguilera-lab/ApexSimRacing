import { prisma } from '@/lib/prisma'
import { maskEmail } from './mask'
import { sendMail } from './index'

type Contenido = (u: { username: string }) => { subject: string; html: string }

/**
 * Confirmaciones (inscripción, plan activo, cancelación): TRANSACCIONAL, con EmailLog e idempotentes
 * por referencia. Ni bloquea ni lanza: un fallo de email nunca puede romper el flujo que la llama.
 * Devuelve la promesa solo para las pruebas; quien la llama no debe esperarla.
 */
export function enviarConfirmacion(userId: string, referencia: string, contenido: Contenido): Promise<void> {
  try {
    return (async () => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, username: true } })
      if (!user) return
      const r = await sendMail({ userId, tipo: 'TRANSACCIONAL', referencia, to: user.email, ...contenido(user) })
      if (r.estado === 'FALLIDO' || r.estado === 'DETENIDO') console.warn(`[Mail] Confirmación ${referencia.split(':')[0]} a ${maskEmail(user.email)}: ${r.estado}${r.motivo ? ` (${r.motivo})` : ''}`)
    })().catch(() => { console.error(`[Mail] Error en confirmación ${referencia.split(':')[0]}`) })
  } catch {
    console.error('[Mail] Error en confirmación')
    return Promise.resolve()
  }
}
