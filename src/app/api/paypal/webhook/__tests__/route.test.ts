import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { crearFakeEmailLog } from '@/lib/mail/__tests__/fakeEmailLog'

const m = vi.hoisted(() => ({
  db: { actual: null as any },
  userFind: vi.fn(), userUpdate: vi.fn(), subFindFirst: vi.fn(), subFindUnique: vi.fn(), subUpdateMany: vi.fn(), equipoFindFirst: vi.fn(),
  activarPlan: vi.fn(), cancelarSuscripcion: vi.fn(), getPlanId: vi.fn(), verificar: vi.fn(), getSession: vi.fn(),
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
vi.mock('@/lib/paypal', () => ({ getPlanId: m.getPlanId, verificarWebhookPayPal: m.verificar, getPayPalSubscription: vi.fn(), PAYPAL_EQUIPO_PLAN_IDS: {} }))
vi.mock('next-auth', () => ({ getServerSession: m.getSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/equipos', () => ({ activarPlanEquipoFounder: vi.fn() }))
vi.mock('@/lib/referidos', () => ({ vincularReferido: m.vincularReferido, registrarComisionPago: m.registrarComision, desactivarUsoReferido: m.desactivarUso }))
vi.mock('@/lib/actividad', () => ({ logActividad: m.logActividad, datosCliente: () => ({}) }))
vi.mock('@/lib/mail/transporte', () => ({ enviarCrudo: m.transport, envioDetenido: () => false }))

import { POST } from '../route'
import { POST as CAPTURE } from '../../capture-subscription/route'

const env = process.env as Record<string, string | undefined>
const original = { ...env }
const activado = { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: 'I-SUB1', custom_id: JSON.stringify({ userId: 'u1', plan: 'PRO' }) } }
const webhook = (body: unknown) => new NextRequest('http://localhost/api/paypal/webhook', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
// Da tiempo a que termine el envío en segundo plano (no se espera en la respuesta del webhook)
const drenar = () => new Promise(r => setTimeout(r, 100))

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
    m.getSession.mockResolvedValue({ user: { id: 'u1' } })
    delete env.PAYPAL_CLIENT_SECRET
    env.EMAIL_DRY_RUN = 'false'
    delete env.EMAIL_TEST_TO
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
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
    expect(mail.to).not.toBe(env.EMAIL_TEST_TO)
    expect(mail.subject).toBe('Tu plan PRO está activo — ¡A competir!')
    expect(mail.subject).not.toContain('[TEST]')
  })

  // 1
  it('dos POST simultáneos con el mismo evento envían 1 email', async () => {
    const [a, b] = await Promise.all([POST(webhook(activado)), POST(webhook(activado))])
    expect([a.status, b.status]).toEqual([200, 200])
    await drenar()
    expect(m.activarPlan).toHaveBeenCalledTimes(2) // la lógica de pagos no cambia: sigue siendo idempotente por su lado
    expect(m.transport).toHaveBeenCalledOnce()
    expect(m.db.actual.filas).toEqual([expect.objectContaining({ referencia: 'suscripcion_activa:I-SUB1', estado: 'ENVIADO', intentos: 1 })])
  })

  it('dos procesos distintos (módulos aislados) con el mismo evento a la vez envían 1 email', async () => {
    vi.resetModules()
    const { POST: POST_B } = await import('../route')
    const [a, b] = await Promise.all([POST(webhook(activado)), POST_B(webhook(activado))])
    expect([a.status, b.status]).toEqual([200, 200])
    await drenar()
    expect(m.transport).toHaveBeenCalledOnce()
    expect(m.db.actual.filas).toHaveLength(1)
  })

  it('un reenvío posterior del mismo evento no reenvía el email', async () => {
    await POST(webhook(activado)); await drenar()
    await POST(webhook(activado)); await drenar()
    expect(m.transport).toHaveBeenCalledOnce()
  })

  // 2
  it('capture-subscription y después el webhook ACTIVATED de la misma suscripción: 1 email', async () => {
    const cap = await CAPTURE(new NextRequest('http://localhost/api/paypal/capture-subscription', { method: 'POST', body: JSON.stringify({ subscriptionId: 'I-SUB1', plan: 'PRO' }), headers: { 'content-type': 'application/json' } }))
    expect(cap.status).toBe(200)
    await drenar()
    const res = await POST(webhook(activado))
    expect(res.status).toBe(200)
    await drenar()
    expect(m.transport).toHaveBeenCalledOnce()
  })

  // 3
  it('si falla findUnique del usuario el webhook responde 200 { received: true }', async () => {
    m.userFind.mockRejectedValue(new Error('db caída'))
    const res = await POST(webhook(activado))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    await drenar()
    expect(m.activarPlan).toHaveBeenCalledOnce()
    expect(m.transport).not.toHaveBeenCalled()
  })

  it('si falla el transporte el webhook responde 200 y el EmailLog queda FALLIDO', async () => {
    m.transport.mockRejectedValue(new Error('smtp'))
    const res = await POST(webhook(activado))
    expect(res.status).toBe(200)
    await drenar()
    expect(m.db.actual.filas[0]).toMatchObject({ estado: 'FALLIDO' })
  })
})

// 4
describe('POST /api/paypal/webhook · sendMail lanza', () => {
  afterEach(() => { vi.doUnmock('@/lib/mail'); vi.resetModules() })

  it('si sendMail lanza, el webhook responde 200 { received: true }', async () => {
    vi.resetModules()
    const sendMail = vi.fn().mockRejectedValue(new Error('boom'))
    vi.doMock('@/lib/mail', () => ({ sendMail, MAX_INTENTOS: 4 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    m.verificar.mockResolvedValue(true)
    m.equipoFindFirst.mockResolvedValue(null)
    m.getPlanId.mockResolvedValue({ precioFounder: false })
    m.activarPlan.mockResolvedValue({ precio: 15, fechaRenovacion: new Date('2026-12-05T00:00:00Z') })
    m.userUpdate.mockResolvedValue({})
    m.userFind.mockResolvedValue({ email: 'ana@dominio.com', username: 'ana' })
    env.PAYPAL_WEBHOOK_ID = 'WH-TEST'
    const { POST: POST_MOCK } = await import('../route')
    const res = await POST_MOCK(webhook(activado))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ received: true })
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledOnce())
    await drenar()
  })
})
