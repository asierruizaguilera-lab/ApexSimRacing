import { beforeEach, expect, it, vi } from 'vitest'

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }))

beforeEach(() => {
  vi.resetModules()
  sendMail.mockReset()
  process.env.EMAIL_PROVIDER = 'gmail'
  process.env.GMAIL_USER = 'sender@example.com'
  process.env.GMAIL_APP_PASSWORD = 'secret'
})

it('detiene envíos posteriores tras una respuesta de cuota de Gmail', async () => {
  const error = Object.assign(new Error('Daily user sending quota exceeded'), { responseCode: 550, response: '5.4.5 Daily user sending quota exceeded' })
  sendMail.mockRejectedValueOnce(error)
  const { enviarCrudo } = await import('../transporte')
  expect((await enviarCrudo({ to: 'a@example.com', subject: 'a', html: '' })).estado).toBe('DETENIDO')
  expect((await enviarCrudo({ to: 'b@example.com', subject: 'b', html: '' })).estado).toBe('DETENIDO')
  expect(sendMail).toHaveBeenCalledTimes(1)
})
