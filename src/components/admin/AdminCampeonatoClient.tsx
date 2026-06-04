'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Check, X, Save } from 'lucide-react'
import { DISCIPLINA_LABELS, SIMULADOR_LABELS, formatFechaHora, cn } from '@/lib/utils'

const DISCIPLINAS = ['RALLY', 'CIRCUITO', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']
const SIMULADORES = ['ASSETTO_CORSA', 'EA_WRC', 'DIRT_RALLY', 'F1_24', 'BEAMNG']
const ESTADOS = ['PROXIMO', 'ACTIVO', 'FINALIZADO']

export function AdminCampeonatoClient({ campeonato }: { campeonato: any }) {
  const router = useRouter()
  const isNew = !campeonato

  const [form, setForm] = useState({
    nombre: campeonato?.nombre || '',
    disciplina: campeonato?.disciplina || 'CIRCUITO',
    simulador: campeonato?.simulador || 'ASSETTO_CORSA',
    descripcion: campeonato?.descripcion || '',
    estado: campeonato?.estado || 'PROXIMO',
    fechaInicio: campeonato?.fechaInicio?.slice(0, 10) || '',
    fechaFin: campeonato?.fechaFin?.slice(0, 10) || '',
    maxPilotos: campeonato?.maxPilotos || 20,
    modsReq: campeonato?.modsReq || '',
  })
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'info' | 'carreras' | 'inscripciones' | 'resultados'>('info')
  const [showCarreraForm, setShowCarreraForm] = useState(false)
  const [carreraForm, setCarreraForm] = useState({
    nombre: '', circuito: '', fecha: '', hora: '20:00', duracionMin: 60,
    servidorIP: '', servidorPassword: '', transmisionUrl: '', modsRequeridos: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function guardarCampeonato(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = isNew ? '/api/campeonatos' : `/api/campeonatos/${campeonato.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(isNew ? 'Campeonato creado' : 'Campeonato actualizado')
      if (isNew) router.push(`/admin/campeonatos/${data.id}`)
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function eliminarCampeonato() {
    if (!confirm('¿Eliminar este campeonato? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/campeonatos/${campeonato.id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Campeonato eliminado'); router.push('/admin') }
    else toast.error('Error al eliminar')
  }

  async function crearCarrera(e: React.FormEvent) {
    e.preventDefault()
    const fechaCompleta = `${carreraForm.fecha}T${carreraForm.hora}:00`
    const res = await fetch('/api/carreras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...carreraForm, fecha: fechaCompleta, campeonatoId: campeonato.id }),
    })
    if (res.ok) {
      toast.success('Carrera creada')
      setShowCarreraForm(false)
      router.refresh()
    } else toast.error('Error al crear carrera')
  }

  async function gestionarInscripcion(inscId: string, estado: 'CONFIRMADA' | 'CANCELADA') {
    const res = await fetch(`/api/inscripciones/${inscId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    if (res.ok) {
      toast.success(estado === 'CONFIRMADA' ? 'Inscripción confirmada' : 'Inscripción cancelada')
      router.refresh()
    } else toast.error('Error')
  }

  const InputClass = 'w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors'
  const LabelClass = 'block text-sm font-medium mb-1.5 text-apex-muted'

  return (
    <div>
      <Link href="/admin" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Panel Admin
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isNew ? 'Nuevo Campeonato' : `Editar: ${campeonato.nombre}`}</h1>
        {!isNew && (
          <button onClick={eliminarCampeonato} className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-1">
            <Trash2 size={14} />Eliminar
          </button>
        )}
      </div>

      {!isNew && (
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 mb-6 overflow-x-auto">
          {[
            { id: 'info', label: 'Información' },
            { id: 'carreras', label: `Carreras (${campeonato.carreras?.length || 0})` },
            { id: 'inscripciones', label: `Inscripciones (${campeonato.inscripciones?.length || 0})` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.id ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
              )}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {(isNew || tab === 'info') && (
        <form onSubmit={guardarCampeonato} className="space-y-4 bg-apex-card border border-apex-border rounded-xl p-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LabelClass}>Nombre del Campeonato</label>
              <input type="text" value={form.nombre} onChange={set('nombre')} required className={InputClass} placeholder="APEX GT Series 2025" />
            </div>
            <div>
              <label className={LabelClass}>Disciplina</label>
              <select value={form.disciplina} onChange={set('disciplina')} className={InputClass}>
                {DISCIPLINAS.map(d => <option key={d} value={d}>{DISCIPLINA_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className={LabelClass}>Simulador</label>
              <select value={form.simulador} onChange={set('simulador')} className={InputClass}>
                {SIMULADORES.map(s => <option key={s} value={s}>{SIMULADOR_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className={LabelClass}>Estado</label>
              <select value={form.estado} onChange={set('estado')} className={InputClass}>
                {ESTADOS.map(e => <option key={e} value={e}>{e === 'PROXIMO' ? 'Próximo' : e === 'ACTIVO' ? 'Activo' : 'Finalizado'}</option>)}
              </select>
            </div>
            <div>
              <label className={LabelClass}>Máximo de Pilotos</label>
              <input type="number" value={form.maxPilotos} onChange={set('maxPilotos')} min={2} max={100} className={InputClass} />
            </div>
            <div>
              <label className={LabelClass}>Fecha de Inicio</label>
              <input type="date" value={form.fechaInicio} onChange={set('fechaInicio')} required className={InputClass} />
            </div>
            <div>
              <label className={LabelClass}>Fecha de Fin</label>
              <input type="date" value={form.fechaFin} onChange={set('fechaFin')} required className={InputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={LabelClass}>Descripción</label>
              <textarea value={form.descripcion} onChange={set('descripcion')} rows={4} required className={InputClass} placeholder="Descripción del campeonato..." />
            </div>
            <div className="sm:col-span-2">
              <label className={LabelClass}>Mods Requeridos (opcional)</label>
              <textarea value={form.modsReq} onChange={set('modsReq')} rows={3} className={InputClass} placeholder="Nombre del mod — https://link-de-descarga.com" />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
              <Save size={16} />
              {loading ? 'Guardando...' : isNew ? 'Crear Campeonato' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}

      {tab === 'carreras' && !isNew && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowCarreraForm(!showCarreraForm)}
              className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-medium transition-colors">
              <Plus size={16} />{showCarreraForm ? 'Cancelar' : 'Nueva Carrera'}
            </button>
          </div>

          {showCarreraForm && (
            <form onSubmit={crearCarrera} className="bg-apex-card border border-apex-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Nueva Carrera</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={LabelClass}>Nombre</label><input type="text" value={carreraForm.nombre} onChange={e => setCarreraForm(f => ({ ...f, nombre: e.target.value }))} required className={InputClass} placeholder="Ronda 1 — Monza" /></div>
                <div><label className={LabelClass}>Circuito</label><input type="text" value={carreraForm.circuito} onChange={e => setCarreraForm(f => ({ ...f, circuito: e.target.value }))} required className={InputClass} placeholder="Autodromo Nazionale di Monza" /></div>
                <div><label className={LabelClass}>Fecha</label><input type="date" value={carreraForm.fecha} onChange={e => setCarreraForm(f => ({ ...f, fecha: e.target.value }))} required className={InputClass} /></div>
                <div><label className={LabelClass}>Hora (CET)</label><input type="time" value={carreraForm.hora} onChange={e => setCarreraForm(f => ({ ...f, hora: e.target.value }))} required className={InputClass} /></div>
                <div><label className={LabelClass}>Duración (min)</label><input type="number" value={carreraForm.duracionMin} onChange={e => setCarreraForm(f => ({ ...f, duracionMin: parseInt(e.target.value) }))} min={15} className={InputClass} /></div>
                <div><label className={LabelClass}>IP del Servidor</label><input type="text" value={carreraForm.servidorIP} onChange={e => setCarreraForm(f => ({ ...f, servidorIP: e.target.value }))} className={InputClass} placeholder="185.23.44.12:9600" /></div>
                <div><label className={LabelClass}>Contraseña Servidor</label><input type="text" value={carreraForm.servidorPassword} onChange={e => setCarreraForm(f => ({ ...f, servidorPassword: e.target.value }))} className={InputClass} placeholder="apex2025" /></div>
                <div><label className={LabelClass}>URL Transmisión</label><input type="url" value={carreraForm.transmisionUrl} onChange={e => setCarreraForm(f => ({ ...f, transmisionUrl: e.target.value }))} className={InputClass} placeholder="https://twitch.tv/..." /></div>
                <div className="sm:col-span-2"><label className={LabelClass}>Mods Requeridos</label><textarea value={carreraForm.modsRequeridos} onChange={e => setCarreraForm(f => ({ ...f, modsRequeridos: e.target.value }))} rows={2} className={InputClass} placeholder="Mods específicos para esta carrera..." /></div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium">
                  <Save size={14} />Crear Carrera
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {campeonato.carreras?.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 bg-apex-card border border-apex-border rounded-xl p-4">
                <div className="flex-1">
                  <div className="font-medium">{c.nombre}</div>
                  <div className="text-sm text-apex-muted">{c.circuito} · {formatFechaHora(c.fecha)}</div>
                </div>
                <Link href={`/admin/resultados/${c.id}`}
                  className="px-3 py-1.5 bg-apex-surface border border-apex-border rounded-lg text-xs hover:border-apex-red/50 transition-colors">
                  Subir Resultados
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'inscripciones' && !isNew && (
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-apex-border text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Estado</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border/50">
              {campeonato.inscripciones?.map((i: any) => (
                <tr key={i.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm">{i.user.username}</div>
                    <div className="text-xs text-apex-muted">{i.user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', {
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30': i.estado === 'PENDIENTE',
                      'bg-green-500/20 text-green-400 border-green-500/30': i.estado === 'CONFIRMADA',
                      'bg-red-500/20 text-red-400 border-red-500/30': i.estado === 'CANCELADA',
                    })}>
                      {i.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.estado === 'PENDIENTE' && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => gestionarInscripcion(i.id, 'CONFIRMADA')}
                          className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                          <Check size={14} />
                        </button>
                        <button onClick={() => gestionarInscripcion(i.id, 'CANCELADA')}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
