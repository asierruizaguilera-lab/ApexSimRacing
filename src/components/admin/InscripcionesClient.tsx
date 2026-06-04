'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Check, X } from 'lucide-react'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, formatFecha, getPaisFlag, cn } from '@/lib/utils'

interface Inscripcion {
  id: string
  estado: string
  fechaInscripcion: string
  user: { id: string; username: string; email: string; pais: string | null }
  campeonato: { id: string; nombre: string; disciplina: string }
}

export function InscripcionesClient({ inscripciones }: { inscripciones: Inscripcion[] }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState('PENDIENTE')
  const [estados, setEstados] = useState<Record<string, string>>(
    Object.fromEntries(inscripciones.map(i => [i.id, i.estado]))
  )
  const [loading, setLoading] = useState<string | null>(null)

  const filtradas = inscripciones.filter(i =>
    filtro === 'TODOS' || estados[i.id] === filtro
  )

  async function gestionar(id: string, estado: 'CONFIRMADA' | 'CANCELADA') {
    setLoading(id)
    const res = await fetch(`/api/inscripciones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    setLoading(null)
    if (res.ok) {
      setEstados(prev => ({ ...prev, [id]: estado }))
      toast.success(estado === 'CONFIRMADA' ? 'Inscripción confirmada' : 'Inscripción cancelada')
    } else {
      toast.error('Error al actualizar')
    }
  }

  return (
    <div>
      {/* Filtros */}
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 mb-6 w-fit">
        {['TODOS', 'PENDIENTE', 'CONFIRMADA', 'CANCELADA'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
            )}>
            {f === 'TODOS' ? 'Todas' : f === 'PENDIENTE' ? 'Pendientes' : f === 'CONFIRMADA' ? 'Confirmadas' : 'Canceladas'}
            {f !== 'TODOS' && (
              <span className="ml-1.5 text-[10px] bg-white/20 rounded-full px-1.5">
                {inscripciones.filter(i => estados[i.id] === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Campeonato</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden md:table-cell">Fecha</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-apex-muted">
                  No hay inscripciones con este filtro
                </td>
              </tr>
            ) : filtradas.map(i => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{i.user.username}</div>
                  <div className="text-xs text-apex-muted">{getPaisFlag(i.user.pais)} {i.user.email}</div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[i.campeonato.disciplina])}>
                    {DISCIPLINA_LABELS[i.campeonato.disciplina]}
                  </span>
                  <div className="text-xs text-apex-muted mt-0.5">{i.campeonato.nombre}</div>
                </td>
                <td className="px-4 py-3 text-sm text-apex-muted hidden md:table-cell">
                  {formatFecha(i.fechaInscripcion)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', {
                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30': estados[i.id] === 'PENDIENTE',
                    'bg-green-500/20 text-green-400 border-green-500/30': estados[i.id] === 'CONFIRMADA',
                    'bg-red-500/20 text-red-400 border-red-500/30': estados[i.id] === 'CANCELADA',
                  })}>
                    {estados[i.id]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {estados[i.id] === 'PENDIENTE' && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => gestionar(i.id, 'CONFIRMADA')}
                        disabled={loading === i.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs hover:bg-green-500/30 transition-colors disabled:opacity-50">
                        <Check size={12} />Confirmar
                      </button>
                      <button
                        onClick={() => gestionar(i.id, 'CANCELADA')}
                        disabled={loading === i.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors disabled:opacity-50">
                        <X size={12} />Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
