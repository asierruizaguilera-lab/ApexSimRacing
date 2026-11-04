import 'server-only'
import nodemailer from 'nodemailer'
import { mailConfig, EmailProvider } from './config'

export type ResultadoTransporte = { estado: 'ENVIADO' | 'FALLIDO' | 'DETENIDO'; motivo?: string }
type Crudo = { to: string; subject: string; html: string; text?: string; headers?: Record<string, string> }

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined
let cola: Promise<void> = Promise.resolve()
let ultimoEnvio = 0
let detenidoHasta = 0

export function envioDetenido() {
  if (detenidoHasta && Date.now() >= detenidoHasta) detenidoHasta = 0
  return detenidoHasta > Date.now()
}

function esCuota(error: any) {
  const msg = String(error?.response || error?.message || '')
  return [550, 421, 452, 454].includes(Number(error?.responseCode)) && /5\.4\.5|4\.5\.3|daily user sending quota exceeded|too many recipients|quota/i.test(msg)
}

function siguienteDiaMadrid(): number {
  const now = new Date()
  const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number)
  const tomorrow = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2] + 1, 0, 0, 0))
  // Resolve midnight in Madrid (UTC+1/+2) with a UTC target and timezone offset.
  const target = new Date(`${tomorrow.toISOString().slice(0, 10)}T00:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Madrid', timeZoneName: 'shortOffset' }).formatToParts(target)
  const offset = parts.find(p => p.type === 'timeZoneName')?.value.match(/GMT([+-]\d+)/)?.[1]
  return target.getTime() - Number(offset || 1) * 3600000
}

async function realSend(mail: Crudo, provider: EmailProvider): Promise<ResultadoTransporte> {
  const cfg = mailConfig()
  if (provider === 'gmail') {
    if (!cfg.gmailUser || !cfg.gmailAppPassword) return { estado: 'FALLIDO', motivo: 'sin_credenciales' }
    transporter ||= nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: cfg.gmailUser, pass: cfg.gmailAppPassword }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 })
    let timeout: ReturnType<typeof setTimeout>
    const timed = new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 30000) })
    try { await Promise.race([transporter.sendMail({ from: { name: cfg.fromName, address: cfg.gmailUser }, replyTo: cfg.gmailUser, ...mail }), timed]) }
    finally { clearTimeout(timeout!) }
    return { estado: 'ENVIADO' }
  }
  if (!cfg.resendApiKey) return { estado: 'FALLIDO', motivo: 'sin_credenciales' }
  const { Resend } = await import('resend')
  const resend = new Resend(cfg.resendApiKey)
  const result = await resend.emails.send({ from: 'APEX SimRacing <noreply@apexsimracing.gg>', ...mail })
  if (result.error) throw new Error('resend_error')
  return { estado: 'ENVIADO' }
}

// `proveedor` permite forzar uno distinto de EMAIL_PROVIDER (p. ej. respaldo de Resend para emails de seguridad)
export function enviarCrudo(mail: Crudo, proveedor?: EmailProvider): Promise<ResultadoTransporte> {
  const provider = proveedor ?? mailConfig().provider
  const task = cola.then(async () => {
    if (envioDetenido()) return { estado: 'DETENIDO' } as ResultadoTransporte
    const wait = Math.max(0, 1000 - (Date.now() - ultimoEnvio))
    if (ultimoEnvio) await new Promise(resolve => setTimeout(resolve, wait))
    ultimoEnvio = Date.now()
    try { return await realSend(mail, provider) }
    catch (error) {
      if (provider === 'gmail' && esCuota(error)) {
        detenidoHasta = siguienteDiaMadrid()
        console.error('[Mail] Cuota de Gmail agotada: envío detenido')
        return { estado: 'DETENIDO', motivo: 'cuota' } as ResultadoTransporte
      }
      return { estado: 'FALLIDO', motivo: 'error_transporte' } as ResultadoTransporte
    }
  })
  cola = task.then(() => undefined, () => undefined)
  return task
}
