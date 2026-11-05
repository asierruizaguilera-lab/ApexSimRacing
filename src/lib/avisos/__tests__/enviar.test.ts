import { beforeEach, describe, expect, it, vi } from 'vitest'

const { count, findMany, inscripciones, sendMail } = vi.hoisted(() => ({ count: vi.fn(), findMany: vi.fn(), inscripciones: vi.fn(), sendMail: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { emailLog: { count, findMany }, inscripcion: { findMany: inscripciones } } }))
vi.mock('@/lib/mail', () => ({ sendMail }))
import { ejecutarAvisos } from '../enviar'
import { parseRoundSchedule } from '../decision'

const rondas = parseRoundSchedule(JSON.stringify([{ ronda: 1, campeonatoId: 'c', circuito: 'X', entrenamientos: ['2026-01-02T19:00'], carrera: '2026-01-03T21:00' }])).rondas
const ahora = new Date('2026-01-01T18:00:00Z')
const usuarios = ['a', 'b', 'c'].map(id => ({ user: { id, email: `${id}@example.test`, username: id } }))
beforeEach(() => { count.mockReset().mockResolvedValue(0); findMany.mockReset().mockResolvedValue([]); inscripciones.mockReset().mockResolvedValue(usuarios); sendMail.mockReset().mockResolvedValue({ estado: 'ENVIADO' }) })

describe('ejecutarAvisos', () => {
  it('sin pendientes no consulta Prisma', async () => { await ejecutarAvisos({ ahora: new Date('2026-01-01T00:00Z'), dry: false, rondas }); expect(count).not.toHaveBeenCalled() })
  it('excluye destinatarios ya enviados', async () => { findMany.mockResolvedValue([{ userId: 'a' }]); await ejecutarAvisos({ ahora, dry: false, rondas }); expect(sendMail).toHaveBeenCalledTimes(2); expect(sendMail).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'a' })) })
  it('respeta cuota de 450', async () => { count.mockResolvedValue(449); const r = await ejecutarAvisos({ ahora, dry: false, rondas }); expect(sendMail).toHaveBeenCalledTimes(1); expect(r.detenido).toBe('cuota') })
  it('con cuota agotada no envía', async () => { count.mockResolvedValue(450); const r = await ejecutarAvisos({ ahora, dry: false, rondas }); expect(sendMail).not.toHaveBeenCalled(); expect(r.detenido).toBe('cuota') })
  it('dry cuenta, pero no llama sendMail', async () => { const r = await ejecutarAvisos({ ahora, dry: true, rondas }); expect(sendMail).not.toHaveBeenCalled(); expect(r.pendientes[0].destinatarios).toBe(3) })
  it('DETENIDO para el bucle', async () => { sendMail.mockResolvedValue({ estado: 'DETENIDO' }); const r = await ejecutarAvisos({ ahora, dry: false, rondas }); expect(sendMail).toHaveBeenCalledTimes(1); expect(r.detenido).toBe('transporte') })
})
