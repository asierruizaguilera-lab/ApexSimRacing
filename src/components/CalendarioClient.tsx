'use client'

import { useState } from 'react'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, formatFechaHora, cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar, Server, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

interface Carrera {
  id: string; nombre: string; circuito: string; fecha: string; duracionMin: number
  estado: string; servidorIP?: string | null; servidorPassword?: string | null
  transmisionUrl?: string | null; modsRequeridos?: string | null
  campeonato: { id: string; nombre: string; disciplina: string; simulador: string }
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarioClient({ carreras, inscripcionIds }: { carreras: Carrera[]; inscripcionIds: string[] }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Carrera | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Día de la semana del primer día (0=Lun)
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))

  function carrerasDelDia(day: Date): Carrera[] {
    return carreras.filter(c => {
      const cd = new Date(c.fecha)
      return cd.getFullYear() === day.getFullYear() && cd.getMonth() === day.getMonth() && cd.getDate() === day.getDate()
    })
  }

  function exportICS(carrera: Carrera) {
    const start = new Date(carrera.fecha)
    const end = new Date(start.getTime() + carrera.duracionMin * 60000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//APEX SimRacing//ES',
      'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${carrera.nombre} — APEX SimRacing`,
      `DESCRIPTION:${carrera.campeonato.nombre}\\n${carrera.circuito}`,
      `LOCATION:${carrera.circuito}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n')
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${carrera.nombre.replace(/\s+/g, '_')}.ics`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Evento exportado al calendario')
  }

  function copiar(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  }

  const isInscrito = selected ? inscripcionIds.includes(selected.campeonato.id) : false

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Calendario */}
      <div className="lg:col-span-3 bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        {/* Header mes */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-apex-border">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-apex-surface transition-colors">
            <ChevronLeft size={18} />
          </button>
          <h2 className="font-bold">{MESES[month]} {year}</h2>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-apex-surface transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Días semana */}
        <div className="grid grid-cols-7 border-b border-apex-border">
          {DIAS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-apex-muted py-2">{d}</div>
          ))}
        </div>

        {/* Grid días */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="aspect-square p-1 border-r border-b border-apex-border/30" />
            const eventos = carrerasDelDia(day)
            const isToday = day.toDateString() === today.toDateString()
            return (
              <div key={i}
                onClick={() => eventos.length > 0 && setSelected(eventos[0])}
                className={cn(
                  'aspect-square p-1 border-r border-b border-apex-border/30 flex flex-col transition-colors',
                  eventos.length > 0 ? 'cursor-pointer hover:bg-apex-surface' : '',
                  isToday ? 'bg-apex-red/10' : ''
                )}>
                <span className={cn(
                  'text-xs font-medium self-start px-1',
                  isToday ? 'bg-apex-red text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-apex-muted'
                )}>
                  {day.getDate()}
                </span>
                {eventos.slice(0, 2).map((e, ei) => (
                  <div key={ei} className={cn('mt-0.5 text-[9px] px-1 rounded truncate', DISCIPLINA_COLORS[e.campeonato.disciplina])}>
                    {e.nombre.split('—')[0].trim()}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel derecho */}
      <div className="lg:col-span-2 space-y-4">
        {selected ? (
          <div className="bg-apex-card border border-apex-border rounded-xl p-5 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border mb-2 inline-block', DISCIPLINA_COLORS[selected.campeonato.disciplina])}>
                  {DISCIPLINA_LABELS[selected.campeonato.disciplina]}
                </span>
                <h3 className="font-bold text-lg">{selected.nombre}</h3>
                <p className="text-apex-muted text-sm">{selected.circuito}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-apex-muted hover:text-apex-text text-xl leading-none">×</button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-apex-muted">Campeonato</span>
                <span className="font-medium">{selected.campeonato.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-apex-muted">Fecha</span>
                <span className="font-medium">{formatFechaHora(selected.fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-apex-muted">Duración</span>
                <span className="font-medium">{selected.duracionMin} minutos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-apex-muted">Estado</span>
                <span className={cn('font-medium', {
                  'text-green-400': selected.estado === 'EN_CURSO',
                  'text-blue-400': selected.estado === 'PROGRAMADA',
                  'text-gray-400': selected.estado === 'FINALIZADA',
                })}>
                  {selected.estado === 'PROGRAMADA' ? 'Programada' : selected.estado === 'EN_CURSO' ? 'En Curso' : 'Finalizada'}
                </span>
              </div>
            </div>

            {isInscrito && selected.servidorIP && selected.estado !== 'FINALIZADA' && (
              <div className="bg-apex-surface rounded-lg p-3 mb-4 border border-apex-border">
                <div className="text-xs font-semibold text-apex-muted mb-2 flex items-center gap-1">
                  <Server size={12} />SERVIDOR
                </div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <code className="text-xs text-green-400">{selected.servidorIP}</code>
                  <button onClick={() => copiar(selected.servidorIP!, 'IP')} className="text-apex-muted hover:text-apex-text">
                    <Copy size={12} />
                  </button>
                </div>
                {selected.servidorPassword && (
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-yellow-400">{selected.servidorPassword}</code>
                    <button onClick={() => copiar(selected.servidorPassword!, 'Contraseña')} className="text-apex-muted hover:text-apex-text">
                      <Copy size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {selected.transmisionUrl && (
              <a href={selected.transmisionUrl} target="_blank" rel="noopener noreferrer"
                className="block text-center py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-sm mb-2 hover:bg-red-600/30 transition-colors">
                📺 Ver Transmisión
              </a>
            )}

            <button onClick={() => exportICS(selected)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-apex-surface border border-apex-border rounded-lg text-sm hover:border-apex-red/50 transition-colors">
              <Calendar size={14} />Exportar a calendario (.ics)
            </button>
          </div>
        ) : (
          <div className="bg-apex-card border border-apex-border rounded-xl p-5 text-center text-apex-muted">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Haz clic en un día con eventos para ver los detalles</p>
          </div>
        )}

        {/* Próximas carreras */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-apex-border">
            <h3 className="font-semibold text-sm">Próximas Carreras</h3>
          </div>
          <div className="divide-y divide-apex-border/50">
            {carreras.filter(c => new Date(c.fecha) > new Date() && c.estado === 'PROGRAMADA').slice(0, 5).map(c => (
              <button key={c.id} onClick={() => setSelected(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-apex-surface/50 transition-colors text-left">
                <div className={cn('w-1.5 h-8 rounded-full', {
                  'bg-orange-500': c.campeonato.disciplina === 'RALLY',
                  'bg-blue-500': c.campeonato.disciplina === 'CIRCUITO',
                  'bg-purple-500': c.campeonato.disciplina === 'DRIFT',
                  'bg-green-500': c.campeonato.disciplina === 'KARTCROSS',
                  'bg-red-500': c.campeonato.disciplina === 'MONOPLAZA',
                })} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.nombre}</div>
                  <div className="text-xs text-apex-muted">{formatFechaHora(c.fecha)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
