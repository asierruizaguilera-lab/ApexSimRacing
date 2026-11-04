import { prisma } from '@/lib/prisma'
import { mailConfig } from './config'
import { urlBaja } from './baja'
import { maskEmail } from './mask'
import { evaluarElegibilidad, TipoMail } from './reglas'
import { enviarCrudo } from './transporte'

type Estado = 'ENVIADO' | 'SIMULADO' | 'OMITIDO' | 'DUPLICADO' | 'FALLIDO' | 'DETENIDO'
type Input = { userId: string; tipo: TipoMail; referencia: string; to: string; subject: string; html: string; text?: string }
const enCurso = new Set<string>()
const keyOf = (x: Input) => `${x.userId}\0${x.tipo}\0${x.referencia}`

async function guardar(input: Input, estado: 'ENVIADO' | 'SIMULADO' | 'FALLIDO' | 'OMITIDO', detalle?: string, protegerEnviado = false) {
  const where = { userId_tipo_referencia: { userId: input.userId, tipo: input.tipo, referencia: input.referencia } }
  if (protegerEnviado) {
    const existing = await prisma.emailLog.findUnique({ where })
    if (existing?.estado === 'ENVIADO') return
    if (existing) { await prisma.emailLog.update({ where: { id: existing.id }, data: { estado, detalle } }); return }
  }
  await prisma.emailLog.upsert({ where, create: { userId: input.userId, tipo: input.tipo, referencia: input.referencia, estado, detalle }, update: { estado, detalle } })
}

export async function sendMail(input: Input): Promise<{ estado: Estado; motivo?: string }> {
  const key = keyOf(input)
  if (enCurso.has(key)) return { estado: 'DUPLICADO' }
  enCurso.add(key)
  try {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { marketingConsent: true, emailUnsubscribedAt: true } })
    if (!user) return { estado: 'FALLIDO', motivo: 'usuario_no_existe' }
    const elegibilidad = evaluarElegibilidad({ tipo: input.tipo, marketingConsent: user.marketingConsent, emailUnsubscribedAt: user.emailUnsubscribedAt })
    if (!elegibilidad.permitido) {
      await guardar(input, 'OMITIDO', elegibilidad.motivo, true)
      return { estado: 'OMITIDO', motivo: elegibilidad.motivo }
    }
    const where = { userId_tipo_referencia: { userId: input.userId, tipo: input.tipo, referencia: input.referencia } }
    const previous = await prisma.emailLog.findUnique({ where })
    if (previous?.estado === 'ENVIADO' || (previous?.estado === 'OMITIDO' && previous.detalle === 'baja')) return { estado: 'DUPLICADO' }
    const cfg = mailConfig()
    const to = cfg.testTo || input.to
    const subject = cfg.testTo ? `[TEST] ${input.subject}` : input.subject
    if (cfg.dryRun) {
      await guardar(input, 'SIMULADO', `dry_run:${maskEmail(to)}`)
      return { estado: 'SIMULADO' }
    }
    const headers: Record<string, string> = {}
    if (input.tipo !== 'TRANSACCIONAL') {
      const unsubscribe = urlBaja(input.userId)
      if (unsubscribe) { headers['List-Unsubscribe'] = `<${unsubscribe}>`; headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click' }
    }
    const result = await enviarCrudo({ to, subject, html: input.html, text: input.text, headers })
    if (result.estado === 'DETENIDO') {
      try { await guardar(input, 'FALLIDO', 'cuota', true) } catch { console.error(`[Mail] No se pudo guardar ${maskEmail(to)}`) }
      return { estado: 'DETENIDO' }
    }
    if (result.estado !== 'ENVIADO') {
      await guardar(input, 'FALLIDO', result.motivo || 'error_transporte', true)
      return { estado: 'FALLIDO', motivo: result.motivo }
    }
    try { await guardar(input, cfg.testTo ? 'SIMULADO' : 'ENVIADO', cfg.testTo ? 'test_to' : undefined) }
    catch { console.error(`[Mail] Enviado a ${maskEmail(to)}; no se pudo guardar EmailLog`) }
    return { estado: cfg.testTo ? 'SIMULADO' : 'ENVIADO' }
  } catch (error) {
    try { await guardar(input, 'FALLIDO', 'error_interno', true) } catch { console.error(`[Mail] Error y fallo al guardar para ${maskEmail(input.to)}`) }
    console.error(`[Mail] Error procesando ${maskEmail(input.to)}`)
    return { estado: 'FALLIDO', motivo: 'error_interno' }
  } finally { enCurso.delete(key) }
}
