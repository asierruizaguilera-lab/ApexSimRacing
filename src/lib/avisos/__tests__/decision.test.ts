import { describe, expect, it } from 'vitest'
import { avisosPendientes, minutoTieneTrabajo, parseRoundSchedule } from '../decision'

const base = (entrenamientos = ['2026-01-02T19:00'], carrera = '2026-01-03T21:00') => JSON.stringify([{ ronda: 2, campeonatoId: 'camp-1', circuito: 'X', entrenamientos, carrera }])
describe('decision de avisos', () => {
  it('parsea válido, descarta inválido y acepta vacío', () => {
    expect(parseRoundSchedule(base()).rondas).toHaveLength(1)
    const malo = parseRoundSchedule(JSON.stringify([{ ronda: 0, campeonatoId: '', circuito: 3, entrenamientos: ['x'], carrera: 'x' }, { ronda: 1, campeonatoId: 'ok', circuito: 'Y', entrenamientos: [], carrera: '2026-01-02T21:00' }]))
    expect(malo.rondas).toHaveLength(1); expect(malo.error).toBeTruthy()
    expect(parseRoundSchedule('').error).toBeUndefined()
    expect(parseRoundSchedule('').rondas).toEqual([])
  })
  it.each([['2026-01-02T19:00', '2026-01-02T18:00:00.000Z'], ['2026-07-02T19:00', '2026-07-02T17:00:00.000Z']])('convierte hora Madrid %s', (local, utc) => {
    expect(parseRoundSchedule(base([local])).rondas[0].entrenamientos[0].toISOString()).toBe(utc)
  })
  it('dispara avisos en el minuto objetivo, respeta ventanas y referencias', () => {
    const ronda = parseRoundSchedule(base()).rondas
    const objetivos = [new Date('2026-01-01T18:00:00Z'), new Date('2026-01-02T20:00:00Z'), new Date('2026-01-03T19:00:00Z')]
    expect(objetivos.map(x => avisosPendientes(ronda, x).map(p => p.aviso))).toEqual([['aviso_ronda'], ['recordatorio_carrera'], ['ultima_hora_carrera']])
    const aviso = avisosPendientes(ronda, objetivos[0])[0]
    expect(aviso.referencia).toContain('camp-1'); expect(aviso.referencia).toContain('ronda2')
    expect(avisosPendientes(ronda, new Date(objetivos[0].getTime() - 1))).toHaveLength(0)
    expect(avisosPendientes(ronda, new Date(objetivos[0].getTime() + 2 * 3600000))).toHaveLength(0)
    expect(avisosPendientes(ronda, new Date(objetivos[0].getTime() + 119 * 60000))).toHaveLength(1)
    expect(avisosPendientes(ronda, new Date(objetivos[2].getTime() + 19 * 60000))).toHaveLength(1)
    expect(avisosPendientes(ronda, new Date(objetivos[2].getTime() + 20 * 60000))).toHaveLength(0)
    expect(minutoTieneTrabajo(ronda, new Date('2026-01-01T00:00:00Z'))).toBe(false)
  })
  it('no avisa ronda sin entrenamientos', () => {
    const ronda = parseRoundSchedule(base([], '2026-01-03T21:00')).rondas
    expect(avisosPendientes(ronda, new Date('2026-01-02T20:00:00Z')).map(p => p.aviso)).not.toContain('aviso_ronda')
  })
})
