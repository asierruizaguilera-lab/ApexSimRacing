import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearFakeEmailLog } from './fakeEmailLog'

const { userFind, transport, db } = vi.hoisted(() => ({ userFind: vi.fn(), transport: vi.fn(), db: { actual: null as any } }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFind }, get emailLog() { return db.actual.emailLog } } }))
vi.mock('../transporte', () => ({ enviarCrudo: transport, envioDetenido: () => false }))

import { sendMail, reservar, MAX_INTENTOS, ENVIANDO_HUERFANO_MS } from '../index'
import { evaluarElegibilidad } from '../reglas'
import { maskEmail } from '../mask'
import { firmarBaja, verificarBaja } from '../baja'

const env = process.env as Record<string, string | undefined>
const input = { userId: 'u1', tipo: 'COMERCIAL' as const, referencia: 'ref', to: 'ana@dominio.com', subject: 'Hola', html: '<p>Hola</p>' }
const tx = { ...input, tipo: 'TRANSACCIONAL' as const }
const user = (marketingConsent = true, emailUnsubscribedAt: Date | null = null) => ({ marketingConsent, emailUnsubscribedAt })
const fila = () => db.actual.filas[0]

describe('mail core', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.actual = crearFakeEmailLog()
    env.NODE_ENV = 'test'
    env.EMAIL_DRY_RUN = 'false'
    delete env.EMAIL_TEST_TO
    env.UNSUBSCRIBE_SECRET = 'test-secret'
    env.NEXTAUTH_URL = 'https://example.test'
    userFind.mockResolvedValue(user())
    transport.mockResolvedValue({ estado: 'ENVIADO' })
  })

  it('aplica reglas por tipo', async () => {
    expect(evaluarElegibilidad({ tipo: 'TRANSACCIONAL', marketingConsent: false, emailUnsubscribedAt: new Date() }).permitido).toBe(true)
    userFind.mockResolvedValue(user(false, new Date()))
    expect((await sendMail({ ...input, tipo: 'SERVICIO' })).estado).toBe('OMITIDO')
    userFind.mockResolvedValue(user(false))
    expect((await sendMail({ ...input, referencia: 'r2' })).estado).toBe('OMITIDO')
    userFind.mockResolvedValue(user(true))
    expect((await sendMail({ ...input, referencia: 'r2' })).estado).toBe('ENVIADO')
  })

  it('reserva ENVIANDO antes de llamar al transporte y cierra en ENVIADO', async () => {
    transport.mockImplementation(async () => { expect(fila().estado).toBe('ENVIANDO'); return { estado: 'ENVIADO' } })
    expect((await sendMail(input)).estado).toBe('ENVIADO')
    expect(fila()).toMatchObject({ estado: 'ENVIADO', intentos: 1 })
  })

  it('deduplica ENVIADO y permite reintentar SIMULADO, FALLIDO y OMITIDO por consentimiento', async () => {
    await sendMail(input)
    expect((await sendMail(input)).estado).toBe('DUPLICADO')
    expect(transport).toHaveBeenCalledOnce()
    for (const estado of ['SIMULADO', 'FALLIDO', 'OMITIDO']) {
      fila().estado = estado; fila().detalle = estado === 'OMITIDO' ? 'sin_consentimiento' : null; fila().intentos = 0
      expect((await sendMail(input)).estado).toBe('ENVIADO')
    }
  })

  it('dos reservas simultáneas de la misma referencia: solo una gana', async () => {
    const [a, b] = await Promise.all([reservar(tx), reservar(tx)])
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1)
    expect(db.actual.filas).toHaveLength(1)
  })

  it('una reserva ENVIANDO reciente bloquea; una de más de 10 min es huérfana y se reintenta', async () => {
    await reservar(tx)
    expect(await sendMail(tx)).toEqual({ estado: 'DUPLICADO', motivo: 'en_curso' })
    expect(transport).not.toHaveBeenCalled()
    db.actual.envejecer(ENVIANDO_HUERFANO_MS + 1)
    expect((await sendMail(tx)).estado).toBe('ENVIADO')
    expect(transport).toHaveBeenCalledOnce()
  })

  it('reintenta un FALLIDO hasta 1 envío + 3 reintentos; la cuota no cuenta como intento', async () => {
    transport.mockResolvedValue({ estado: 'FALLIDO', motivo: 'error_transporte' })
    for (let i = 0; i < MAX_INTENTOS; i++) expect((await sendMail(tx)).estado).toBe('FALLIDO')
    expect(fila().intentos).toBe(4)
    expect(await sendMail(tx)).toEqual({ estado: 'FALLIDO', motivo: 'max_reintentos' })
    expect(transport).toHaveBeenCalledTimes(4)

    db.actual = crearFakeEmailLog()
    transport.mockResolvedValue({ estado: 'DETENIDO' })
    expect((await sendMail(tx)).estado).toBe('DETENIDO')
    expect(fila()).toMatchObject({ estado: 'FALLIDO', detalle: 'cuota', intentos: 0 })
  })

  it('usa DRY_RUN activo por defecto sin transporte', async () => {
    delete env.EMAIL_DRY_RUN
    expect((await sendMail(input)).estado).toBe('SIMULADO')
    expect(transport).not.toHaveBeenCalled()
    expect(fila().estado).toBe('SIMULADO')
  })

  it('redirige a EMAIL_TEST_TO y prefija asunto', async () => {
    env.EMAIL_TEST_TO = 'qa@dominio.com'
    expect((await sendMail(input)).estado).toBe('SIMULADO')
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'qa@dominio.com', subject: '[TEST] Hola' }))
  })

  describe('en producción', () => {
    beforeEach(() => { env.NODE_ENV = 'production'; env.EMAIL_DRY_RUN = 'true'; env.EMAIL_TEST_TO = 'qa@dominio.com' })

    it('TRANSACCIONAL se envía con DRY_RUN=true y EMAIL_TEST_TO no lo desvía', async () => {
      expect((await sendMail(tx)).estado).toBe('ENVIADO')
      expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@dominio.com', subject: 'Hola' }))
      expect(fila().estado).toBe('ENVIADO')
    })

    it('SERVICIO y COMERCIAL siguen respetando DRY_RUN', async () => {
      expect((await sendMail({ ...input, tipo: 'SERVICIO' })).estado).toBe('SIMULADO')
      expect((await sendMail(input)).estado).toBe('SIMULADO')
      expect(transport).not.toHaveBeenCalled()
    })

    it('SERVICIO respeta EMAIL_TEST_TO', async () => {
      env.EMAIL_DRY_RUN = 'false'
      await sendMail({ ...input, tipo: 'SERVICIO' })
      expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'qa@dominio.com', subject: '[TEST] Hola' }))
    })
  })

  it('fuera de producción TRANSACCIONAL respeta DRY_RUN', async () => {
    env.EMAIL_DRY_RUN = 'true'
    expect((await sendMail(tx)).estado).toBe('SIMULADO')
    expect(transport).not.toHaveBeenCalled()
  })

  it('enmascara email y valida firma de baja', () => {
    expect(maskEmail('ana@dominio.com')).toBe('a***@dominio.com')
    const token = firmarBaja('u1')!
    expect(verificarBaja(token)).toBe('u1')
    expect(verificarBaja(`${token.slice(0, -2)}xx`)).toBeNull()
  })

  it('TRANSACCIONAL se envía aunque haya baja, sin cabeceras de baja', async () => {
    userFind.mockResolvedValue(user(false, new Date()))
    expect((await sendMail(tx)).estado).toBe('ENVIADO')
    expect(transport).toHaveBeenCalledWith(expect.objectContaining({ headers: {} }))
  })

  it('OMITIDO por baja bloquea aunque la baja ya no conste', async () => {
    userFind.mockResolvedValue(user(true, new Date()))
    await sendMail({ ...input, tipo: 'SERVICIO' })
    userFind.mockResolvedValue(user(true))
    expect((await sendMail({ ...input, tipo: 'SERVICIO' })).estado).toBe('DUPLICADO')
    expect(transport).not.toHaveBeenCalled()
  })

  it('SERVICIO lleva List-Unsubscribe de un clic', async () => {
    await sendMail({ ...input, tipo: 'SERVICIO' })
    const { headers } = transport.mock.calls[0][0]
    expect(headers['List-Unsubscribe']).toMatch(/^<https:\/\/example\.test\/api\/unsubscribe\?token=.+>$/)
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('nunca lanza si Prisma falla', async () => {
    userFind.mockRejectedValue(new Error('db'))
    await expect(sendMail(input)).resolves.toEqual({ estado: 'FALLIDO', motivo: 'error_interno' })
  })
})
