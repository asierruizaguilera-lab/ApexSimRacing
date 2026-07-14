import Papa from 'papaparse'
import { fromZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/prisma'
import type { Disciplina } from '@prisma/client'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR5bxkXYnxmOs7h7tYWPCPZ4GvyWbDAocMpt1_IfnH5y8hubaDn_tfL4RrLzxQ_eW23NpokqamGWC34/pub?gid=0&single=true&output=csv'

const DISCIPLINAS_VALIDAS: Disciplina[] = ['RALLY', 'CIRCUITO', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']

interface FilaSheet {
  nombre: string
  campeonato: string
  disciplina: string
  circuito: string
  linkModCircuito: string
  coche: string
  linkModCoche: string
  fecha: string
  hora: string
  vueltas: string
  maxPilotos: string
  descripcion: string
}

export interface ResultadoSync {
  creadas: number
  omitidas: number
  errores: string[]
}

function parseFila(row: string[]): FilaSheet {
  return {
    nombre: (row[0] || '').trim(),
    campeonato: (row[1] || '').trim(),
    disciplina: (row[2] || '').trim().toUpperCase(),
    circuito: (row[3] || '').trim(),
    linkModCircuito: (row[4] || '').trim(),
    coche: (row[5] || '').trim(),
    linkModCoche: (row[6] || '').trim(),
    fecha: (row[7] || '').trim(),
    hora: (row[8] || '').trim(),
    vueltas: (row[9] || '').trim(),
    maxPilotos: (row[10] || '').trim(),
    descripcion: (row[11] || '').trim(),
  }
}

// Interpreta fecha (DD/MM/YYYY) + hora (HH:MM) como hora local de Europe/Madrid y devuelve el instante UTC correspondiente
function parseFechaHora(fecha: string, hora: string): Date | null {
  const m = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, yyyy] = m

  const horaValida = /^(\d{1,2}):(\d{2})$/.test(hora) ? hora : '00:00'
  const [hh, min] = horaValida.split(':')

  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:00`
  const date = fromZonedTime(iso, 'Europe/Madrid')
  return isNaN(date.getTime()) ? null : date
}

export async function syncCarrerasDesdeSheet(tipo: 'AUTOMATICA' | 'MANUAL' = 'AUTOMATICA'): Promise<ResultadoSync> {
  let creadas = 0
  let omitidas = 0
  const errores: string[] = []

  let csvText: string
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    csvText = (await res.text()).replace(/^﻿/, '')
  } catch (err: any) {
    const mensaje = `No se pudo acceder al Google Sheet: ${err?.message || err}`
    console.error('[SyncSheet]', mensaje)
    await prisma.syncLog.create({
      data: { creadas: 0, omitidas: 0, errores: JSON.stringify([mensaje]), tipo },
    })
    return { creadas: 0, omitidas: 0, errores: [mensaje] }
  }

  const parsed = Papa.parse(csvText, { skipEmptyLines: true })
  const filas = (parsed.data as string[][]).slice(1) // fila 1 = títulos

  const campeonatosCache = new Map<string, { id: string; fechaInicio: Date; fechaFin: Date }>()

  for (let i = 0; i < filas.length; i++) {
    const numFila = i + 2

    try {
      const fila = parseFila(filas[i])

      if (!fila.nombre || !fila.campeonato || !fila.fecha || !fila.disciplina) {
        errores.push(`Fila ${numFila}: faltan datos requeridos (nombre, campeonato, fecha o disciplina)`)
        omitidas++
        continue
      }
      if (!DISCIPLINAS_VALIDAS.includes(fila.disciplina as Disciplina)) {
        errores.push(`Fila ${numFila}: disciplina "${fila.disciplina}" no es válida`)
        omitidas++
        continue
      }

      const fechaCarrera = parseFechaHora(fila.fecha, fila.hora)
      if (!fechaCarrera) {
        errores.push(`Fila ${numFila}: fecha u hora con formato inválido ("${fila.fecha}" "${fila.hora}")`)
        omitidas++
        continue
      }

      let campeonato = campeonatosCache.get(fila.campeonato)
      if (!campeonato) {
        const existente = await prisma.campeonato.findFirst({ where: { nombre: fila.campeonato } })
        if (existente) {
          campeonato = { id: existente.id, fechaInicio: existente.fechaInicio, fechaFin: existente.fechaFin }
        } else {
          const maxPilotos = parseInt(fila.maxPilotos, 10)
          const nuevo = await prisma.campeonato.create({
            data: {
              nombre: fila.campeonato,
              disciplina: fila.disciplina as Disciplina,
              simulador: 'ASSETTO_CORSA',
              descripcion: fila.descripcion || 'Campeonato creado automáticamente desde Google Sheets',
              estado: 'ACTIVO',
              fechaInicio: fechaCarrera,
              fechaFin: fechaCarrera,
              maxPilotos: Number.isFinite(maxPilotos) && maxPilotos > 0 ? maxPilotos : 20,
            },
          })
          campeonato = { id: nuevo.id, fechaInicio: nuevo.fechaInicio, fechaFin: nuevo.fechaFin }
        }
        campeonatosCache.set(fila.campeonato, campeonato)
      }

      const yaExiste = await prisma.carrera.findFirst({
        where: { campeonatoId: campeonato.id, nombre: fila.nombre, fecha: fechaCarrera },
        select: { id: true },
      })
      if (yaExiste) {
        omitidas++
        continue
      }

      const vueltas = parseInt(fila.vueltas, 10)

      await prisma.carrera.create({
        data: {
          campeonatoId: campeonato.id,
          nombre: fila.nombre,
          circuito: fila.circuito,
          fecha: fechaCarrera,
          vueltas: Number.isFinite(vueltas) && vueltas > 0 ? vueltas : null,
          coche: fila.coche || null,
          linkModCircuito: fila.linkModCircuito || null,
          linkModCoche: fila.linkModCoche || null,
          origenSheet: true,
        },
      })
      creadas++

      // Amplía el rango de fechas del campeonato si esta carrera cae fuera de él (nunca lo reduce)
      const nuevaFechaInicio = fechaCarrera < campeonato.fechaInicio ? fechaCarrera : campeonato.fechaInicio
      const nuevaFechaFin = fechaCarrera > campeonato.fechaFin ? fechaCarrera : campeonato.fechaFin
      if (nuevaFechaInicio !== campeonato.fechaInicio || nuevaFechaFin !== campeonato.fechaFin) {
        await prisma.campeonato.update({
          where: { id: campeonato.id },
          data: { fechaInicio: nuevaFechaInicio, fechaFin: nuevaFechaFin },
        })
        campeonato.fechaInicio = nuevaFechaInicio
        campeonato.fechaFin = nuevaFechaFin
      }
    } catch (err: any) {
      console.error(`[SyncSheet] Error en fila ${numFila}:`, err)
      errores.push(`Fila ${numFila}: error inesperado — ${err?.message || err}`)
      omitidas++
    }
  }

  await prisma.syncLog.create({
    data: { creadas, omitidas, errores: errores.length > 0 ? JSON.stringify(errores) : null, tipo },
  })

  console.log(`[SyncSheet] ${tipo}: ${creadas} creadas, ${omitidas} omitidas, ${errores.length} errores`)
  return { creadas, omitidas, errores }
}
