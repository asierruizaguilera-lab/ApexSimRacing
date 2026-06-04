'use client'

import { useState, useEffect } from 'react'
import { Flag, Clock } from 'lucide-react'
import { DISCIPLINA_LABELS, DISCIPLINA_COLORS, cn } from '@/lib/utils'
import Link from 'next/link'

interface Props {
  proximaCarrera: {
    id: string
    nombre: string
    circuito: string
    fecha: string
    campeonato: { nombre: string; disciplina: string }
  } | null
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    if (!targetDate) return
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [targetDate])

  return timeLeft
}

export function HeroBanner({ proximaCarrera }: Props) {
  const { days, hours, minutes, seconds } = useCountdown(proximaCarrera?.fecha ?? null)

  if (!proximaCarrera) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-r from-apex-card to-apex-surface border border-apex-border rounded-2xl p-8">
        <div className="text-center">
          <div className="text-4xl mb-3">🏁</div>
          <h2 className="text-xl font-bold">Próximamente nuevas carreras</h2>
          <p className="text-apex-muted mt-2">Mantente atento a los anuncios de la comunidad</p>
        </div>
      </div>
    )
  }

  const pad = (n: number) => n.toString().padStart(2, '0')

  return (
    <div className="relative overflow-hidden bg-apex-card border border-apex-border rounded-2xl p-6 lg:p-8">
      {/* Decorative bg */}
      <div className="absolute inset-0 bg-gradient-to-r from-apex-red/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-apex-red/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="countdown-live text-xs font-medium text-apex-red uppercase tracking-wider">
              Próximo Evento
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">
            {proximaCarrera.nombre}
          </h2>
          <p className="text-apex-muted mb-2">{proximaCarrera.circuito}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('text-xs px-2 py-1 rounded-full border', DISCIPLINA_COLORS[proximaCarrera.campeonato.disciplina])}>
              {DISCIPLINA_LABELS[proximaCarrera.campeonato.disciplina]}
            </span>
            <span className="text-xs text-apex-muted flex items-center gap-1">
              <Flag size={12} />
              {proximaCarrera.campeonato.nombre}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div className="flex gap-3">
          {[
            { value: days, label: 'Días' },
            { value: hours, label: 'Horas' },
            { value: minutes, label: 'Min' },
            { value: seconds, label: 'Seg' },
          ].map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center bg-apex-surface border border-apex-border rounded-xl px-3 lg:px-4 py-3 min-w-[60px]">
              <div className="text-2xl lg:text-3xl font-bold text-white font-mono tabular-nums">
                {pad(value)}
              </div>
              <div className="text-apex-muted text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 flex items-center gap-2">
        <Clock size={14} className="text-apex-muted" />
        <span className="text-sm text-apex-muted">
          {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(proximaCarrera.fecha))}
        </span>
      </div>
    </div>
  )
}
