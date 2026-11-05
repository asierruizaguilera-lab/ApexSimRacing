import { formatInTimeZone } from 'date-fns-tz'
import { prisma } from '@/lib/prisma'
import { sendMail, MAX_INTENTOS } from '@/lib/mail'
import { avisosPendientes, type Ronda, type AvisoPendiente } from './decision'

export const TOPE_DIARIO = 450
type Estado = 'ENVIADO' | 'SIMULADO' | 'OMITIDO' | 'DUPLICADO' | 'FALLIDO'
type Conteo = { referencia: string; destinatarios: number; enviados: number; simulados: number; omitidos: number; duplicados: number; fallidos: number }
type Resumen = { ahora: string; dry: boolean; pendientes: Conteo[]; enviados24h: number; restante: number; detenido?: 'cuota' | 'transporte' }

function escapar(s: string) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!) }
function hora(d: Date) { return formatInTimeZone(d, 'Europe/Madrid', 'dd/MM HH:mm') }
function contenido(p: AvisoPendiente, username: string) {
  const circuito = escapar(p.circuito)
  const nombre = escapar(username)
  let subject: string
  let cuerpo: string
  if (p.aviso === 'aviso_ronda') {
    subject = `Ronda ${p.ronda} en ${p.circuito}: mañana empiezan los entrenamientos`
    cuerpo = `Mañana empiezan los entrenamientos de la ronda ${p.ronda} en ${circuito}.<br><br>Entrenamientos:<br>${p.entrenamientos.map(x => hora(x)).join('<br>')}<br><br>Carrera: ${hora(p.carrera)}`
  } else if (p.aviso === 'recordatorio_carrera') {
    subject = `Mañana corres la ronda ${p.ronda} en ${p.circuito}`
    cuerpo = `Mañana corres la ronda ${p.ronda} en ${circuito}. La carrera empieza el ${hora(p.carrera)}.`
  } else {
    subject = `Ronda ${p.ronda} en ${p.circuito}: la carrera empieza en 1 hora`
    cuerpo = `La carrera de la ronda ${p.ronda} en ${circuito} empieza en 1 hora, a las ${hora(p.carrera)}.`
  }
  const url = `${process.env.NEXTAUTH_URL}/campeonatos/${encodeURIComponent(p.campeonatoId)}`
  const textBody = cuerpo.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')
  return { subject, html: `<p>Hola ${nombre}:</p><p>${cuerpo}</p><p><a href="${escapar(url)}">Ver campeonato</a></p>`, text: `Hola ${username}:\n\n${textBody}\n\nVer campeonato: ${url}` }
}

export async function ejecutarAvisos({ ahora, dry, rondas }: { ahora: Date; dry: boolean; rondas: Ronda[] }): Promise<Resumen> {
  const pendientes = avisosPendientes(rondas, ahora)
  if (!pendientes.length) return { ahora: ahora.toISOString(), dry, pendientes: [], enviados24h: 0, restante: TOPE_DIARIO }
  const enviados24h = await prisma.emailLog.count({ where: { estado: 'ENVIADO', updatedAt: { gte: new Date(ahora.getTime() - 24 * 60 * 60 * 1000) } } })
  let restante = Math.max(0, TOPE_DIARIO - enviados24h)
  const resumen: Resumen = { ahora: ahora.toISOString(), dry, pendientes: [], enviados24h, restante }
  if (restante <= 0) { resumen.detenido = 'cuota'; return resumen }
  for (const pendiente of pendientes) {
    const inscripciones = await prisma.inscripcion.findMany({ where: { campeonatoId: pendiente.campeonatoId, estado: 'CONFIRMADA', user: { emailUnsubscribedAt: null } }, select: { user: { select: { id: true, email: true, username: true } } } })
    const usuarios = inscripciones.map(x => x.user)
    const yaEnviados = usuarios.length ? await prisma.emailLog.findMany({ where: { tipo: 'SERVICIO', referencia: pendiente.referencia, OR: [{ estado: 'ENVIADO' }, { estado: 'FALLIDO', intentos: { gte: MAX_INTENTOS } }], userId: { in: usuarios.map(u => u.id) } }, select: { userId: true } }) : []
    const excluidos = new Set(yaEnviados.map(x => x.userId))
    const destinatarios = usuarios.filter(u => !excluidos.has(u.id))
    const conteo: Conteo = { referencia: pendiente.referencia, destinatarios: destinatarios.length, enviados: 0, simulados: 0, omitidos: 0, duplicados: 0, fallidos: 0 }
    resumen.pendientes.push(conteo)
    if (dry) continue
    const cuenta = (estado: string) => { if (estado === 'ENVIADO') conteo.enviados++; else if (estado === 'SIMULADO') conteo.simulados++; else if (estado === 'OMITIDO') conteo.omitidos++; else if (estado === 'DUPLICADO') conteo.duplicados++; else conteo.fallidos++ }
    for (const usuario of destinatarios) {
      if (restante <= 0) { resumen.detenido = 'cuota'; break }
      const mail = contenido(pendiente, usuario.username || 'piloto')
      const resultado = await sendMail({ userId: usuario.id, tipo: 'SERVICIO', referencia: pendiente.referencia, to: usuario.email, ...mail })
      cuenta(resultado.estado as Estado)
      if (resultado.estado === 'ENVIADO') restante--
      if (resultado.estado === 'DETENIDO') { resumen.detenido = 'transporte'; break }
    }
    if (resumen.detenido) break
  }
  resumen.restante = restante
  return resumen
}
