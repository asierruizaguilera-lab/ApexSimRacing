import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { ejecutarAvisos } = vi.hoisted(() => ({ ejecutarAvisos: vi.fn() }))
vi.mock('@/lib/avisos/enviar', () => ({ ejecutarAvisos }))
import { GET } from '../route'

function req(query = '') { return new NextRequest(`http://localhost/api/cron/avisos${query}`, { headers: { 'x-cron-secret': 'ok' } }) }
describe('GET /api/cron/avisos', () => {
  beforeEach(() => { process.env.CRON_SECRET = 'ok'; process.env.ROUND_SCHEDULE = '[]'; ejecutarAvisos.mockReset().mockResolvedValue({ ahora: 'x', dry: true, pendientes: [], enviados24h: 0, restante: 450 }) })
  it('401 con secreto erróneo y 503 sin secreto', async () => { expect((await GET(new NextRequest('http://localhost/api/cron/avisos', { headers: { 'x-cron-secret': 'bad' } }))).status).toBe(401); delete process.env.CRON_SECRET; expect((await GET(req())).status).toBe(503) })
  it('dry=1 devuelve resumen', async () => { const r = await GET(req('?dry=1')); expect(r.status).toBe(200); expect(await r.json()).toMatchObject({ dry: true, restante: 450 }); expect(ejecutarAvisos).toHaveBeenCalledWith(expect.objectContaining({ dry: true })) })
})
