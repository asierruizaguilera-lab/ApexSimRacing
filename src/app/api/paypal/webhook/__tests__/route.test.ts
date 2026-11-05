import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { crearFakeEmailLog } from '@/lib/mail/__tests__/fakeEmailLog'

const m = vi.hoisted(() => ({
  db: { actual: null as any },
  userFind: vi.fn(), userUpdate: vi.fn(), subFindFirst: vi.fn(), subFindUnique: vi.fn(), subUpdateMany: vi.fn(), equipoFindFirst: vi.fn(),
  activarPlan: vi.fn(), cancelarSuscripcion: vi.fn(), getPlanId: vi.fn(), verificar: vi.fn(),
  vincularReferido: vi.fn(), registrarComision: vi.fn(), desactivarUso: vi.fn(), logActividad: vi.fn(), transport: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: m.userFind, update: m.userUpdate },
    suscripcion: { findFirst: m.subFindFirst, findUnique: m.subFindUnique, updateMany: m.subUpdateMany },
    equipo: { findFirst: m.equipoFindFirst, update: vi.fn() },
    get emailLog() { return m.db.actual.emailLog },
  },
}))
vi.mock('@/lib/suscripciones', () => ({ activarPlan: m.activarPlan, cancelarSuscripcion: m.cancelarSuscripcion }))
vi.mock('@/lib/paypal', () => ({ getPlanId: m.getPlanId, verificarWebhookPayPal: m.verificar, PAYPAL_EQUIPO_PLAN_IDS: {} }))
vi.mock('@/lib/equipos', () => ({ activarPlanEquipoFounder: vi.fn() }))
vi.mock('@/lib/referidos', () => ({ vincularReferido: m.vincularReferido, registrarComisionPago: m.registrarComision, desactivarUsoReferido: m.desactivarUso }))
vi.mock('@/lib/actividad', () => ({ logActividad: m.logActividad, datosCliente: () => ({}) }))
vi.mock('@/lib/mail/transporte', () => ({ enviarCrudo: m.transport, envioDetenido: () => false }))

import { POST } from '../route'

const env = process.env as Record<string, string | undefined>
const original = { ...env }
const activado = { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: 'I-SUB1', custom_id: JSON.stringify({ userId: 'u1', plan: 'PRO' }) } }
const webhook = (body: unknown) => new NextRequest('http://localhost/api/paypal/webhook', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
// Da tiempo a que termine el envío en segundo plano (no se espera en la respuesta del webhook)
const drenar = () => new Promise(r => setTimeout(r, 50))

describe('POST /api/paypal/webhook · emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.db.actual = crearFakeEmailLog()
    env.NODE_ENV = 'production'
    env.PAYPAL_WEBHOOK_ID = 'WH-TEST'
    env.EMAIL_PROVIDER = 'gmail'
    env.GMAIL_USER = 'remitente@example.com'
    env.GMAIL_APP_PASSWORD = 'x'
    m.verificar.mockResolvedValue(true)
    m.userFind.mockResolvedValue({ email: 'ana@dominio.com', username: 'ana', marketingConsent: false, emailUnsubscribedAt: null })
    m.userUpdate.mockResolvedValue({})
    m.equipoFindFirst.mockResolvedValue(null)
    m.getPlanId.mockResolvedValue({ precioFounder: false })
    m.activarPlan.mockResolvedValue({ precio: 15, fechaRenovacion: new Date('2026-12-05T00:00:00Z') })
    m.vincularReferido.mockResolvedValue(undefined)
    m.transport.mockResolvedValue({ estado: 'ENVIADO' })
  })
  afterEach(() => { for (const k of Object.keys(env)) if (!(k in original)) delete env[k]; Object.assign(env, original) })

  // 5
  it('firma inválida: 400 como hoy, no activa nada y no envía ningún email', async () => {
    m.verificar.mockResolvedValue(false)
    const res = await POST(webhook(activado))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Firma inválida' })
    await drenar()
    expect(m.activarPlan).not.toHaveBeenCalled()
    expect(m.userFind).not.toHaveBeenCalled()
    expect(m.transport).not.toHaveBeenCalled()
    expect(m.db.actual.filas).toHaveLength(0)
    expect(m.logActividad).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'SEGURIDAD', estado: 400, detalle: expect.objectContaining({ motivo: 'webhook_firma_invalida' }) }))
  })

  // 6
  it('en producción con EMAIL_DRY_RUN=true el email de plan activo sale, y EMAIL_TEST_TO no lo desvía', async () => {
    env.EMAIL_DRY_RUN = 'true'
    env.EMAIL_TEST_TO = 'qa@dominio.com'
    const res = await POST(webhook(activado))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    await vi.waitFor(() => expect(m.transport).toHaveBeenCalledOnce())
    const [mail] = m.transport.mock.calls[0]
    expect(mail.to).toBe('ana@dominio.com')
    expect(mail.subject).toBe('Tu plan PRO está activo — ¡A competir!')
  })
})
