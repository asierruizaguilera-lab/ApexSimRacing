import { prisma } from '@/lib/prisma'
import { mailConfig } from './config'
import { urlBaja } from './baja'
import { maskEmail } from './mask'
import { evaluarElegibilidad, TipoMail } from './reglas'
import { enviarCrudo } from './transporte'

type Estado = 'ENVIADO' | 'SIMULADO' | 'OMITIDO' | 'DUPLICADO' | 'FALLIDO' | 'DETENIDO'
type Input = { userId: string; tipo: TipoMail; referencia: string; to: string; subject: string; html: string; text?: string }
// 1 envío + 3 reintentos. Los cortes por cuota (DETENIDO) no cuentan como intento.
export const MAX_INTENTOS = 4
// Una reserva ENVIANDO más antigua se da por huérfana (proceso caído a mitad de envío) y se puede reintentar
export const ENVIANDO_HUERFANO_MS = 10 * 60 * 1000
const enCurso = new Set<string>()
const keyOf = (x: Input) => `${x.userId}\0${x.tipo}\0${x.referencia}`
const whereDe = (x: Input) => ({ userId_tipo_referencia: { userId: x.userId, tipo: x.tipo, referencia: x.referencia } })

/**
 * En producción, TRANSACCIONAL ignora EMAIL_DRY_RUN y EMAIL_TEST_TO (una confirmación de pago tiene que
 * llegar a su dueño). Fuera de producción, y siempre para SERVICIO y COMERCIAL, se respetan los dos.
 */
export function modoEnvio(tipo: TipoMail) {
  const cfg = mailConfig()
  const critico = tipo === 'TRANSACCIONAL' && process.env.NODE_ENV === 'production'
  return { dryRun: critico ? false : cfg.dryRun, testTo: critico ? undefined : cfg.testTo }
}

const esUnico = (e: unknown) => (e as { code?: string })?.code === 'P2002'

/**
 * Reserva el envío creando la fila ENVIANDO antes de llamar al transporte. La restricción única
 * (userId, tipo, referencia) hace que solo una llamada gane aunque lleguen a la vez desde varios procesos.
 */
export async function reservar(input: Input, ahora = new Date()): Promise<{ ok: true; id: string } | { ok: false; estado: 'DUPLICADO' | 'FALLIDO'; motivo?: string }> {
  try {
    const fila = await prisma.emailLog.create({ data: { userId: input.userId, tipo: input.tipo, referencia: input.referencia, estado: 'ENVIANDO' } })
    return { ok: true, id: fila.id }
  } catch (error) {
    if (!esUnico(error)) throw error
  }
  const previa = await prisma.emailLog.findUnique({ where: whereDe(input) })
  if (!previa) return { ok: false, estado: 'DUPLICADO' }
  if (previa.estado === 'ENVIADO' || (previa.estado === 'OMITIDO' && previa.detalle === 'baja')) return { ok: false, estado: 'DUPLICADO' }
  if (previa.estado === 'ENVIANDO' && ahora.getTime() - previa.updatedAt.getTime() < ENVIANDO_HUERFANO_MS) return { ok: false, estado: 'DUPLICADO', motivo: 'en_curso' }
  if (previa.estado === 'FALLIDO' && previa.intentos >= MAX_INTENTOS) return { ok: false, estado: 'FALLIDO', motivo: 'max_reintentos' }
  // Toma la fila solo si nadie la ha cambiado desde que la leímos (bloqueo optimista)
  const { count } = await prisma.emailLog.updateMany({
    where: { id: previa.id, estado: previa.estado, updatedAt: previa.updatedAt },
    data: { estado: 'ENVIANDO', detalle: null },
  })
  return count === 1 ? { ok: true, id: previa.id } : { ok: false, estado: 'DUPLICADO', motivo: 'en_curso' }
}

async function cerrar(id: string, estado: 'ENVIADO' | 'SIMULADO' | 'FALLIDO', detalle: string | null, intento: boolean) {
  await prisma.emailLog.update({ where: { id }, data: { estado, detalle, ...(intento ? { intentos: { increment: 1 } } : {}) } })
}

async function omitir(input: Input, motivo: string) {
  const previa = await prisma.emailLog.findUnique({ where: whereDe(input) })
  if (previa?.estado === 'ENVIADO' || previa?.estado === 'ENVIANDO') return
  await prisma.emailLog.upsert({ where: whereDe(input), create: { userId: input.userId, tipo: input.tipo, referencia: input.referencia, estado: 'OMITIDO', detalle: motivo }, update: { estado: 'OMITIDO', detalle: motivo } })
}

export async function sendMail(input: Input): Promise<{ estado: Estado; motivo?: string }> {
  const key = keyOf(input)
  if (enCurso.has(key)) return { estado: 'DUPLICADO' }
  enCurso.add(key)
  let reservaId: string | undefined
  try {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { marketingConsent: true, emailUnsubscribedAt: true } })
    if (!user) return { estado: 'FALLIDO', motivo: 'usuario_no_existe' }
    const elegibilidad = evaluarElegibilidad({ tipo: input.tipo, marketingConsent: user.marketingConsent, emailUnsubscribedAt: user.emailUnsubscribedAt })
    if (!elegibilidad.permitido) {
      await omitir(input, elegibilidad.motivo!)
      return { estado: 'OMITIDO', motivo: elegibilidad.motivo }
    }
    const reserva = await reservar(input)
    if (!reserva.ok) return { estado: reserva.estado, motivo: reserva.motivo }
    reservaId = reserva.id

    const { dryRun, testTo } = modoEnvio(input.tipo)
    const to = testTo || input.to
    const subject = testTo ? `[TEST] ${input.subject}` : input.subject
    if (dryRun) {
      await cerrar(reservaId, 'SIMULADO', `dry_run:${maskEmail(to)}`, false)
      return { estado: 'SIMULADO' }
    }
    const headers: Record<string, string> = {}
    if (input.tipo !== 'TRANSACCIONAL') {
      const unsubscribe = urlBaja(input.userId)
      if (unsubscribe) { headers['List-Unsubscribe'] = `<${unsubscribe}>`; headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click' }
    }
    const result = await enviarCrudo({ to, subject, html: input.html, text: input.text, headers })
    if (result.estado === 'DETENIDO') {
      try { await cerrar(reservaId, 'FALLIDO', 'cuota', false) } catch { console.error(`[Mail] No se pudo guardar ${maskEmail(to)}`) }
      return { estado: 'DETENIDO' }
    }
    if (result.estado !== 'ENVIADO') {
      await cerrar(reservaId, 'FALLIDO', result.motivo || 'error_transporte', true)
      return { estado: 'FALLIDO', motivo: result.motivo }
    }
    // Si esto falla la fila queda ENVIANDO: pasados 10 min se reintentaría (posible duplicado, lo dejamos en log)
    try { await cerrar(reservaId, testTo ? 'SIMULADO' : 'ENVIADO', testTo ? 'test_to' : null, true) }
    catch { console.error(`[Mail] Enviado a ${maskEmail(to)}; no se pudo cerrar EmailLog`) }
    return { estado: testTo ? 'SIMULADO' : 'ENVIADO' }
  } catch {
    if (reservaId) { try { await cerrar(reservaId, 'FALLIDO', 'error_interno', false) } catch { console.error(`[Mail] Error y fallo al guardar para ${maskEmail(input.to)}`) } }
    console.error(`[Mail] Error procesando ${maskEmail(input.to)}`)
    return { estado: 'FALLIDO', motivo: 'error_interno' }
  } finally { enCurso.delete(key) }
}
