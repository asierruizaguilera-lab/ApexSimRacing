import { beforeEach, expect, it, vi } from 'vitest'

const { transport } = vi.hoisted(() => ({ transport: vi.fn() }))
vi.mock('../transporte', () => ({ enviarCrudo: transport, envioDetenido: () => false }))

import { sendEmail } from '@/lib/email'

const env = process.env as Record<string, string | undefined>
const correo = { to: 'ana@dominio.com', subject: 'Recupera tu contraseña', html: '<p>x</p>' }

beforeEach(() => {
  vi.clearAllMocks()
  transport.mockResolvedValue({ estado: 'ENVIADO' })
  env.EMAIL_PROVIDER = 'gmail'
  env.GMAIL_USER = 'remitente@example.com'
  env.GMAIL_APP_PASSWORD = 'x'
  delete env.EMAIL_DRY_RUN
  delete env.EMAIL_TEST_TO
  env.NODE_ENV = 'test'
})

it('ignora EMAIL_DRY_RUN: los emails de seguridad salen siempre', async () => {
  env.EMAIL_DRY_RUN = 'true'
  expect(await sendEmail(correo)).toBe(true)
  expect(transport).toHaveBeenCalledWith(expect.objectContaining({ to: 'ana@dominio.com' }), 'gmail')
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
  await sendEmail(correo)
  expect(transport).toHaveBeenLastCalledWith(expect.objectContaining({ to: 'ana@dominio.com', subject: 'Recupera tu contraseña' }), 'gmail')
})
