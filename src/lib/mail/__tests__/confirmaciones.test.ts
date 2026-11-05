import { beforeEach, describe, expect, it, vi } from 'vitest'

const { userFind, sendMail } = vi.hoisted(() => ({ userFind: vi.fn(), sendMail: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: userFind } } }))
vi.mock('../index', () => ({ sendMail }))

import { enviarConfirmacion } from '../confirmaciones'

const contenido = (u: { username: string }) => ({ subject: 'Plan activo', html: `<p>${u.username}</p>` })

describe('enviarConfirmacion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    userFind.mockResolvedValue({ email: 'ana@dominio.com', username: 'ana' })
    sendMail.mockResolvedValue({ estado: 'ENVIADO' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('envía TRANSACCIONAL con la referencia y los datos del usuario', async () => {
    await enviarConfirmacion('u1', 'suscripcion_activa:I-1', contenido)
    expect(sendMail).toHaveBeenCalledWith({ userId: 'u1', tipo: 'TRANSACCIONAL', referencia: 'suscripcion_activa:I-1', to: 'ana@dominio.com', subject: 'Plan activo', html: '<p>ana</p>' })
  })

  it.each([
    ['findUnique lanza', () => userFind.mockRejectedValue(new Error('db'))],
    ['sendMail lanza', () => sendMail.mockRejectedValue(new Error('smtp'))],
    ['el contenido lanza', () => {}],
  ])('nunca lanza ni rechaza: %s', async (caso, preparar) => {
    preparar()
    const fn = caso === 'el contenido lanza' ? () => { throw new Error('plantilla') } : contenido
    let p: Promise<void> | undefined
    expect(() => { p = enviarConfirmacion('u1', 'r', fn as any) }).not.toThrow()
    await expect(p).resolves.toBeUndefined()
  })

  it('sin usuario no envía', async () => {
    userFind.mockResolvedValue(null)
    await enviarConfirmacion('u1', 'r', contenido)
    expect(sendMail).not.toHaveBeenCalled()
  })
})
