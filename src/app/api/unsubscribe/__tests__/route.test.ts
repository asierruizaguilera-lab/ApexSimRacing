import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({ prisma: { user: { updateMany: vi.fn() } } }))

import { prisma } from '@/lib/prisma'
import { firmarBaja } from '@/lib/mail/baja'
import * as baja from '@/lib/mail/baja'
import { GET, POST } from '../route'

const updateMany = vi.mocked(prisma.user.updateMany)
const userId = 'usuario-123'

function request(method: string, token?: string, headers?: Record<string, string>, body?: string) {
  const query = token === undefined ? '' : `?token=${encodeURIComponent(token)}`
  return new NextRequest(`http://localhost/api/unsubscribe${query}`, { method, headers, body })
}

describe('GET /api/unsubscribe', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test'
    updateMany.mockReset()
  })

  it('muestra el formulario sin modificar al usuario', async () => {
    const token = firmarBaja(userId)!
    const response = GET(request('GET', token))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('<form method="POST" action="/api/unsubscribe?token=')
    expect(html).toContain('Confirmar baja')
    expect(html).toContain('Dejarás de recibir avisos de ronda')
    expect(updateMany).not.toHaveBeenCalled()
  })

  it.each([undefined, 'manipulado'])('rechaza token inválido: %s', async token => {
    const response = GET(request('GET', token))
    expect(response.status).toBe(400)
    expect(await response.text()).toContain('Enlace de baja no válido o caducado')
  })

  it('escapa caracteres especiales del token en el HTML', async () => {
    vi.spyOn(baja, 'verificarBaja').mockReturnValueOnce(userId)
    const response = GET(request('GET', `abc&"<>'`))
    const html = await response.text()
    expect(html).toContain('token=abc&amp;&quot;&lt;&gt;&#39;')
  })
})

describe('POST /api/unsubscribe', () => {
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = 'test'
    updateMany.mockReset()
    updateMany.mockResolvedValue({ count: 1 })
  })

  it('procesa la baja de un clic', async () => {
    const token = firmarBaja(userId)!
    const response = await POST(request('POST', token, { 'content-type': 'application/x-www-form-urlencoded' }, 'List-Unsubscribe=One-Click'))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('OK')
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: userId, emailUnsubscribedAt: null },
      data: { emailUnsubscribedAt: expect.any(Date) },
    }))
  })

  it('rechaza token manipulado sin actualizar', async () => {
    const response = await POST(request('POST', 'manipulado'))
    expect(response.status).toBe(400)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('devuelve HTML cuando Accept incluye text/html', async () => {
    const response = await POST(request('POST', firmarBaja(userId)!, { accept: 'text/html' }))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toContain('Baja confirmada')
  })

  it('devuelve 500 si falla la base de datos', async () => {
    updateMany.mockRejectedValueOnce(new Error('db'))
    const response = await POST(request('POST', firmarBaja(userId)!))
    expect(response.status).toBe(500)
    expect(updateMany).toHaveBeenCalledOnce()
  })
})
