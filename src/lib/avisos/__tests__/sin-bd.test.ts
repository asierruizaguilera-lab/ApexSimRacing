import { describe, expect, it, vi } from 'vitest'

// Cualquier acceso a prisma (prisma.emailLog, prisma.$queryRaw...) queda registrado
const { accesos } = vi.hoisted(() => ({ accesos: [] as string[] }))
vi.mock('@/lib/prisma', () => ({ prisma: new Proxy({}, { get: (_t, prop) => { accesos.push(String(prop)); return new Proxy(() => Promise.resolve(null), { get: () => () => Promise.resolve(null) }) } }) }))
vi.mock('@/lib/mail', () => ({ sendMail: vi.fn(), MAX_INTENTOS: 4 }))

import { ejecutarAvisos } from '../enviar'
import { minutoTieneTrabajo, parseRoundSchedule } from '../decision'

const rondas = parseRoundSchedule(JSON.stringify([{ ronda: 1, campeonatoId: 'c', circuito: 'X', entrenamientos: ['2026-01-02T19:00'], carrera: '2026-01-03T21:00' }])).rondas

describe('cuando no toca enviar', () => {
  it('0 llamadas a Prisma en todos los minutos sin aviso de un día entero', async () => {
    const inicio = new Date('2026-01-05T00:00:00Z').getTime()
    for (let m = 0; m < 24 * 60; m++) {
      const ahora = new Date(inicio + m * 60000)
      expect(minutoTieneTrabajo(rondas, ahora)).toBe(false)
      const r = await ejecutarAvisos({ ahora, dry: false, rondas })
      expect(r.pendientes).toEqual([])
    }
    expect(accesos).toEqual([])
  })
})
