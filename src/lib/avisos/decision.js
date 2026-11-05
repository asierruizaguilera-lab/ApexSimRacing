'use strict'

const { fromZonedTime, formatInTimeZone } = require('date-fns-tz')
const ZONA = 'Europe/Madrid'
const FORMATO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const AVISOS = Object.freeze({
  aviso_ronda: Object.freeze({ antelacionMs: 24 * 60 * 60 * 1000, ventanaMs: 2 * 60 * 60 * 1000 }),
  recordatorio_carrera: Object.freeze({ antelacionMs: 24 * 60 * 60 * 1000, ventanaMs: 2 * 60 * 60 * 1000 }),
  ultima_hora_carrera: Object.freeze({ antelacionMs: 60 * 60 * 1000, ventanaMs: 20 * 60 * 1000 }),
})

function fechaLocal(valor) {
  if (typeof valor !== 'string' || !FORMATO.test(valor)) return null
  const fecha = fromZonedTime(valor, ZONA)
  return Number.isNaN(fecha.getTime()) || formatInTimeZone(fecha, ZONA, "yyyy-MM-dd'T'HH:mm") !== valor ? null : fecha
}

function parseRoundSchedule(raw) {
  if (!raw) return { rondas: [] }
  let entrada
  try { entrada = JSON.parse(raw) } catch { return { rondas: [], error: 'ROUND_SCHEDULE no es JSON válido' } }
  if (!Array.isArray(entrada)) return { rondas: [], error: 'ROUND_SCHEDULE debe ser un array' }
  const rondas = []
  const errores = []
  entrada.forEach((item, indice) => {
    const motivos = []
    if (!item || typeof item !== 'object' || Array.isArray(item)) motivos.push('debe ser un objeto')
    else {
      if (!Number.isInteger(item.ronda) || item.ronda <= 0) motivos.push('ronda debe ser entero > 0')
      if (typeof item.campeonatoId !== 'string' || !item.campeonatoId.trim()) motivos.push('campeonatoId debe ser texto no vacío')
      if (typeof item.circuito !== 'string') motivos.push('circuito debe ser texto')
      if (!Array.isArray(item.entrenamientos)) motivos.push('entrenamientos debe ser un array')
      else if (item.entrenamientos.some(x => !fechaLocal(x))) motivos.push('entrenamientos contiene una fecha inválida (YYYY-MM-DDTHH:mm)')
      const carrera = fechaLocal(item.carrera)
      if (!carrera) motivos.push('carrera debe ser una fecha válida (YYYY-MM-DDTHH:mm)')
      if (!motivos.length) rondas.push({ ronda: item.ronda, campeonatoId: item.campeonatoId, circuito: item.circuito, entrenamientos: item.entrenamientos.map(fechaLocal), carrera })
    }
    if (motivos.length) errores.push(`Ronda en índice ${indice}: ${motivos.join(', ')}`)
  })
  return { rondas, ...(errores.length ? { error: errores.join('; ') } : {}) }
}

function avisosPendientes(rondas, ahora) {
  const pendientes = []
  for (const ronda of rondas) {
    const primero = ronda.entrenamientos.reduce((min, x) => !min || x < min ? x : min, null)
    const objetivos = [
      ...(primero ? [['aviso_ronda', new Date(primero.getTime() - AVISOS.aviso_ronda.antelacionMs)]] : []),
      ['recordatorio_carrera', new Date(ronda.carrera.getTime() - AVISOS.recordatorio_carrera.antelacionMs)],
      ['ultima_hora_carrera', new Date(ronda.carrera.getTime() - AVISOS.ultima_hora_carrera.antelacionMs)],
    ]
    for (const [aviso, objetivo] of objetivos) {
      if (objetivo <= ahora && ahora < new Date(objetivo.getTime() + AVISOS[aviso].ventanaMs)) {
        pendientes.push({ aviso, ronda: ronda.ronda, campeonatoId: ronda.campeonatoId, circuito: ronda.circuito, objetivo, entrenamientos: ronda.entrenamientos, carrera: ronda.carrera, referencia: `${aviso}:${ronda.campeonatoId}:ronda${ronda.ronda}` })
      }
    }
  }
  return pendientes
}

function minutoTieneTrabajo(rondas, ahora) { return avisosPendientes(rondas, ahora).length > 0 }

module.exports = { AVISOS, parseRoundSchedule, avisosPendientes, minutoTieneTrabajo }
