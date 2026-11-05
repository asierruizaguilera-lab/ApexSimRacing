import { beforeEach, expect, it, vi } from 'vitest'

const { transport, logCreate } = vi.hoisted(() => ({ transport: vi.fn(), logCreate: vi.fn() }))
vi.mock('../transporte', () => ({ enviarCrudo: transport, envioDetenido: () => false }))
vi.mock('@/lib/prisma', () => ({ prisma: { emailLog: { create: logCreate } } }))

import { sendEmail } from '@/lib/email'

const env = process.env as Record<string, string | undefined>
const correo = { to: 'ana@dominio.com', subject: 'Recupera tu contraseña', html: '<p>x</p>' }

beforeEach(() => {
  vi.clearAllMocks()
  transport.mockResolvedValue({ estado: 'ENVIADO' })
  env.EMAIL_PROVIDER = 'gmail'
  env.GMAIL_USER = 'remitente@example.com'
  env.GMAIL_APP_PASSWORD = 'x'
  env.EMAIL_DRY_RUN = 'false'
  delete env.EMAIL_TEST_TO
  env.NODE_ENV = 'test'
})

it('en producción ignora EMAIL_DRY_RUN: los emails de seguridad salen siempre', async () => {
  env.NODE_ENV = 'production'
  env.EMAIL_DRY_RUN = 'true'
  expect(await sendEmail(correo)).toBe(true)
  expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@dominio.com' }), 'gmail')
})

it('fuera de producción respeta EMAIL_DRY_RUN y no llama al transporte', async () => {
  env.EMAIL_DRY_RUN = 'true'
  vi.spyOn(console, 'info').mockImplementation(() => {})
  expect(await sendEmail({ ...correo, registro: { userId: 'u1', referencia: 'r' } })).toBe(true)
  expect(transport).not.toHaveBeenCalled()
  expect(logCreate).not.toHaveBeenCalled()
})

it('con gmail sin credenciales usa Resend como respaldo', async () => {
  delete env.GMAIL_APP_PASSWORD
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(await sendEmail(correo)).toBe(true)
  expect(transport).toHaveBeenCalledWith(expect.anything(), 'resend')
  expect(warn).toHaveBeenCalledWith(expect.stringContaining('Resend como respaldo'))
})

it('EMAIL_TEST_TO redirige fuera de producción y se ignora en producción', async () => {
  env.EMAIL_TEST_TO = 'qa@dominio.com'
  await sendEmail(correo)
  expect(transport).toHaveBeenLastCalledWith(expect.objectContaining({ to: 'qa@dominio.com', subject: '[TEST] Recupera tu contraseña' }), 'gmail')
  env.NODE_ENV = 'production'
  env.EMAIL_DRY_RUN = 'true'
  await sendEmail(correo)
  expect(transport).toHaveBeenLastCalledWith(expect.objectContaining({ to: 'ana@dominio.com', subject: 'Recupera tu contraseña' }), 'gmail')
})

it('con registro guarda un ENVIADO en EmailLog para el tope diario', async () => {
  logCreate.mockResolvedValue({})
  expect(await sendEmail({ ...correo, registro: { userId: 'u1', referencia: 'seguridad:recuperar:abc' } })).toBe(true)
  expect(logCreate).toHaveBeenCalledWith({ data: { userId: 'u1', tipo: 'TRANSACCIONAL', referencia: 'seguridad:recuperar:abc', estado: 'ENVIADO', intentos: 1 } })
})

it('si falla EmailLog el email de seguridad sigue contando como enviado', async () => {
  logCreate.mockRejectedValue(new Error('db'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect(await sendEmail({ ...correo, registro: { userId: 'u1', referencia: 'r' } })).toBe(true)
})

it('sin registro o si no se envía no toca EmailLog', async () => {
  expect(await sendEmail(correo)).toBe(true)
  transport.mockResolvedValue({ estado: 'FALLIDO' })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  expect(await sendEmail({ ...correo, registro: { userId: 'u1', referencia: 'r' } })).toBe(false)
  expect(logCreate).not.toHaveBeenCalled()
})
