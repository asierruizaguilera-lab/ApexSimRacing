'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, Flag, MessageSquareWarning, Paperclip, Save } from 'lucide-react'
import {
  cn, formatFecha, formatFechaHora,
  TIPO_QUEJA_LABELS, ESTADO_QUEJA_LABELS, ESTADO_QUEJA_COLORS,
  TIPO_SANCION_LABELS,
} from '@/lib/utils'

interface UsuarioMini { id: string; username: string; avatar: string | null }
interface Prueba { id: string; descripcion: string; linkPrueba: string | null; creadoEn: string; user: { id: string; username: string } }

interface Queja {
  id: string; tipo: string; estado: string; titulo: string; descripcion: string
  vuelta: number | null; linkRepeticion: string | null
  resolucion: string | null; sancion: string | null
  puntosPenalizados: number | null; diasSuspension: number | null
  fechaResolucion: string | null; creadoEn: string
  denunciante: UsuarioMini
  denunciado: UsuarioMini | null
  carrera: { id: string; nombre: string; campeonato: { id: string; nombre: string } } | null
  pruebas: Prueba[]
}

interface Form { estado: string; resolucion: string; sancion: string; puntosPenalizados: string; diasSuspension: string }

const FILTROS = ['ABIERTA', 'EN_REVISION', 'RESUELTA', 'ARCHIVADA', 'TODAS']
const ESTADOS = ['ABIERTA', 'EN_REVISION', 'RESUELTA', 'ARCHIVADA']
const SANCIONES = ['ADVERTENCIA', 'PENALIZACION_PUNTOS', 'EXCLUSION_CARRERA', 'SUSPENSION_TEMPORAL', 'BAN_PERMANENTE']

const InputClass = 'w-full bg-apex-bg border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none'
const LabelClass = 'block text-xs font-medium text-apex-muted mb-1'

function draftFrom(q: Queja): Form {
  return {
    estado: q.estado,
    resolucion: q.resolucion || '',
    sancion: q.sancion || '',
    puntosPenalizados: q.puntosPenalizados?.toString() || '',
    diasSuspension: q.diasSuspension?.toString() || '',
  }
}

export function AdminIncidenciasClient({ quejas: initial }: { quejas: Queja[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusId = searchParams.get('q')

  const [quejas, setQuejas] = useState(initial)
  const [filtro, setFiltro] = useState(focusId ? 'TODAS' : 'ABIERTA')
  const [expandedId, setExpandedId] = useState<string | null>(focusId)
  const [forms, setForms] = useState<Record<string, Form>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const filtradas = quejas.filter(q => filtro === 'TODAS' || q.estado === filtro)

  function toggle(q: Queja) {
    if (expandedId === q.id) { setExpandedId(null); return }
    setExpandedId(q.id)
    setForms(prev => (prev[q.id] ? prev : { ...prev, [q.id]: draftFrom(q) }))
  }

  function setField(id: string, patch: Partial<Form>) {
    setForms(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function guardar(q: Queja) {
    const f = forms[q.id] || draftFrom(q)
    setLoading(q.id)
    try {
      const body: any = { estado: f.estado, resolucion: f.resolucion }
      if (f.sancion) {
        body.sancion = f.sancion
        if (f.sancion === 'PENALIZACION_PUNTOS') body.puntosPenalizados = f.puntosPenalizados
        if (f.sancion === 'SUSPENSION_TEMPORAL') body.diasSuspension = f.diasSuspension
      } else {
        body.sancion = null
      }
      const res = await fetch(`/api/admin/incidencias/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al guardar'); return }
      toast.success('Incidencia actualizada')
      setQuejas(prev => prev.map(x => x.id === q.id ? { ...x, ...data } : x))
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 mb-6 w-fit overflow-x-auto">
        {FILTROS.map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
            )}>
            {f === 'TODAS' ? 'Todas' : ESTADO_QUEJA_LABELS[f]}
            {f !== 'TODAS' && (
              <span className="ml-1.5 text-[10px] bg-white/20 rounded-full px-1.5">
                {quejas.filter(q => q.estado === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl py-16 text-center text-apex-muted">
          No hay incidencias con este filtro
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(q => {
            const isExpanded = expandedId === q.id
            const f = forms[q.id] || draftFrom(q)
            return (
              <div key={q.id} className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
                <button onClick={() => toggle(q)} className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-apex-surface/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-apex-surface border-apex-border text-apex-muted flex items-center gap-1">
                        {q.tipo === 'INCIDENCIA_CARRERA' ? <Flag size={10} /> : <MessageSquareWarning size={10} />}
                        {TIPO_QUEJA_LABELS[q.tipo]}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_QUEJA_COLORS[q.estado])}>
                        {ESTADO_QUEJA_LABELS[q.estado]}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{q.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-apex-muted mt-1">
                      <span>{q.denunciante.username}{q.denunciado && ` → ${q.denunciado.username}`}</span>
                      {q.carrera && <span>· {q.carrera.campeonato.nombre} — {q.carrera.nombre}</span>}
                      <span>· {formatFecha(q.creadoEn)}</span>
                      {q.pruebas.length > 0 && (
                        <span className="flex items-center gap-1"><Paperclip size={11} />{q.pruebas.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-apex-muted flex-shrink-0 mt-1">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-apex-border p-5 space-y-4">
                    <p className="text-sm text-apex-muted whitespace-pre-wrap leading-relaxed">{q.descripcion}</p>

                    {q.carrera && q.vuelta && <p className="text-xs text-apex-muted">Vuelta {q.vuelta}</p>}
                    {q.linkRepeticion && (
                      <a href={q.linkRepeticion} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-apex-red hover:underline">
                        📺 Ver repetición del incidente
                      </a>
                    )}

                    {q.pruebas.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-apex-muted uppercase tracking-wider mb-2">Pruebas ({q.pruebas.length})</div>
                        <div className="space-y-2">
                          {q.pruebas.map(p => (
                            <div key={p.id} className="bg-apex-surface border border-apex-border rounded-lg p-3 text-sm">
                              <div className="text-xs text-apex-muted mb-1">{p.user.username} · {formatFechaHora(p.creadoEn)}</div>
                              <p className="text-apex-text/90">{p.descripcion}</p>
                              {p.linkPrueba && (
                                <a href={p.linkPrueba} target="_blank" rel="noopener noreferrer" className="text-xs text-apex-red hover:underline">🔗 Ver prueba</a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-apex-border pt-4 space-y-3">
                      <div className="text-xs font-semibold text-apex-muted uppercase tracking-wider">Resolución</div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className={LabelClass}>Estado</label>
                          <select value={f.estado} onChange={e => setField(q.id, { estado: e.target.value })} className={InputClass}>
                            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_QUEJA_LABELS[e]}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={LabelClass}>Sanción {!q.denunciado && '(requiere denunciado)'}</label>
                          <select value={f.sancion} onChange={e => setField(q.id, { sancion: e.target.value })}
                            disabled={!q.denunciado} className={cn(InputClass, !q.denunciado && 'opacity-50 cursor-not-allowed')}>
                            <option value="">Sin sanción</option>
                            {SANCIONES.map(s => <option key={s} value={s}>{TIPO_SANCION_LABELS[s]}</option>)}
                          </select>
                        </div>
                      </div>

                      {f.sancion === 'PENALIZACION_PUNTOS' && (
                        <div>
                          <label className={LabelClass}>Puntos a penalizar</label>
                          <input type="number" min={0} value={f.puntosPenalizados}
                            onChange={e => setField(q.id, { puntosPenalizados: e.target.value })}
                            placeholder="10" className={InputClass} />
                        </div>
                      )}
                      {f.sancion === 'SUSPENSION_TEMPORAL' && (
                        <div>
                          <label className={LabelClass}>Días de suspensión</label>
                          <input type="number" min={1} value={f.diasSuspension}
                            onChange={e => setField(q.id, { diasSuspension: e.target.value })}
                            placeholder="7" className={InputClass} />
                        </div>
                      )}

                      <div>
                        <label className={LabelClass}>Resolución (visible para los implicados)</label>
                        <textarea value={f.resolucion} onChange={e => setField(q.id, { resolucion: e.target.value })} rows={3}
                          placeholder="Explica la decisión tomada" className={InputClass} />
                      </div>

                      {q.sancion && (
                        <p className="text-xs text-apex-muted">
                          Sanción ya aplicada: <strong>{TIPO_SANCION_LABELS[q.sancion]}</strong>. Cambiar la sanción aquí no revertirá ni reaplicará automáticamente los efectos anteriores.
                        </p>
                      )}

                      <div className="flex justify-end">
                        <button onClick={() => guardar(q)} disabled={loading === q.id}
                          className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium hover:bg-apex-red-dark transition-colors disabled:opacity-50">
                          <Save size={14} />{loading === q.id ? 'Guardando...' : 'Guardar Resolución'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
