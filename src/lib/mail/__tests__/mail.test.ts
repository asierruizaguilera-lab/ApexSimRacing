import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userFind, logFind, logUpsert, logUpdate, transport } = vi.hoisted(() => ({
  userFind: vi.fn(), logFind: vi.fn(), logUpsert: vi.fn(), logUpdate: vi.fn(), transport: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFind }, emailLog: { findUnique: logFind, upsert: logUpsert, update: logUpdate } } }))
vi.mock('../transporte', () => ({ enviarCrudo: transport, envioDetenido: () => false }))

import { sendMail } from '../index'
import { evaluarElegibilidad } from '../reglas'
import { maskEmail } from '../mask'
import { firmarBaja, verificarBaja } from '../baja'

const input = { userId: 'u1', tipo: 'COMERCIAL' as const, referencia: 'ref', to: 'ana@dominio.com', subject: 'Hola', html: '<p>Hola</p>' }
const user = (marketingConsent = true, emailUnsubscribedAt: Date | null = null) => ({ marketingConsent, emailUnsubscribedAt })

describe('mail core', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EMAIL_DRY_RUN = 'false'
    delete process.env.EMAIL_TEST_TO
    process.env.UNSUBSCRIBE_SECRET = 'test-secret'
    process.env.NEXTAUTH_URL = 'https://example.test'
    userFind.mockResolvedValue(user())
    logFind.mockResolvedValue(null)
    logUpsert.mockResolvedValue({})
    logUpdate.mockResolvedValue({})
    transport.mockResolvedValue({ estado: 'ENVIADO' })
  })

  it('aplica reglas por tipo', async () => {
    expect(evaluarElegibilidad({ tipo: 'TRANSACCIONAL', marketingConsent: false, emailUnsubscribedAt: new Date() }).permitido).toBe(true)
    userFind.mockResolvedValue(user(false, new Date()))
    expect((await sendMail({ ...input, tipo: 'SERVICIO' })).estado).toBe('OMITIDO')
    userFind.mockResolvedValue(user(false))
    expect((await sendMail(input)).estado).toBe('OMITIDO')
    userFind.mockResolvedValue(user(true))
    expect((await sendMail(input)).estado).toBe('ENVIADO')
  })

  it('deduplica ENVIADO y permite reintentar otros estados', async () => {
    logFind.mockResolvedValue({ estado: 'ENVIADO', detalle: null })
    expect((await sendMail(input)).estado).toBe('DUPLICADO')
    expect(transport).not.toHaveBeenCalled()
    for (const previous of [{ estado: 'SIMULADO' }, { estado: 'FALLIDO' }, { estado: 'OMITIDO', detalle: 'sin_consentimiento' }]) {
      logFind.mockResolvedValue(previous)
      expect((await sendMail(input)).estado).toBe('ENVIADO')
    }
  })

  it('usa DRY_RUN activo por defecto sin transporte', async () => {
    delete process.env.EMAIL_DRY_RUN
    expect((await sendMail(input)).estado).toBe('SIMULADO')
    expect(transport).not.toHaveBeenCalled()
    expect(logUpsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ estado: 'SIMULADO' }) }))
  })

  it('redirige a EMAIL_TEST_TO y prefija asunto', async () => {
    process.env.EMAIL_TEST_TO = 'qa@dominio.com'
    expect((await sendMail(input)).estado).toBe('SIMULADO')
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'qa@dominio.com', subject: '[TEST] Hola' }))
  })

  it('enmascara email y valida firma de baja', () => {
    expect(maskEmail('ana@dominio.com')).toBe('a***@dominio.com')
    const token = firmarBaja('u1')!
    expect(verificarBaja(token)).toBe('u1')
    expect(verificarBaja(`${token.slice(0, -2)}xx`)).toBeNull()
  })

  it('TRANSACCIONAL se envía aunque haya baja, sin cabeceras de baja', async () => {
    userFind.mockResolvedValue(user(false, new Date()))
    expect((await sendMail({ ...input, tipo: 'TRANSACCIONAL' })).estado).toBe('ENVIADO')
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ headers: {} }))
  })

  it('OMITIDO por baja bloquea aunque la baja ya no conste', async () => {
    logFind.mockResolvedValue({ estado: 'OMITIDO', detalle: 'baja' })
    expect((await sendMail({ ...input, tipo: 'SERVICIO' })).estado).toBe('DUPLICADO')
    expect(transport).not.toHaveBeenCalled()
  })

  it('SERVICIO lleva List-Unsubscribe de un clic', async () => {
    await sendMail({ ...input, tipo: 'SERVICIO' })
    const { headers } = transport.mock.calls[0][0]
    expect(headers['List-Unsubscribe']).toMatch(/^<https:\/\/example\.test\/api\/unsubscribe\?token=.+>$/)
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('un fallo posterior no pisa un ENVIADO existente', async () => {
    logFind.mockResolvedValueOnce(null).mockResolvedValue({ id: 'l1', estado: 'ENVIADO' })
    transport.mockResolvedValue({ estado: 'FALLIDO', motivo: 'error_transporte' })
    expect((await sendMail(input)).estado).toBe('FALLIDO')
    expect(logUpsert).not.toHaveBeenCalled()
    expect(logUpdate).not.toHaveBeenCalled()
  })

  it('nunca lanza si Prisma falla', async () => {
    userFind.mockRejectedValue(new Error('db'))
    await expect(sendMail(input)).resolves.toEqual({ estado: 'FALLIDO', motivo: 'error_interno' })
  })
})
