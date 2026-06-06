'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, PLAN_COLORS, PLAN_LABELS, cn } from '@/lib/utils'

const DISCIPLINAS = ['CIRCUITO', 'RALLY', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']
const PLANES = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

interface Coche {
  id: string; nombre: string; disciplina: string; planMinimo: string
  descripcion: string | null; modAC: string | null; activo: boolean
  _count?: { desbloqueos: number }
}

const EMPTY: Omit<Coche, 'id' | '_count'> = {
  nombre: '', disciplina: 'CIRCUITO', planMinimo: 'ROOKIE',
  descripcion: '', modAC: '', activo: true,
}

export function AdminCochesClient({ coches: initial }: { coches: Coche[] }) {
  const router = useRouter()
  const [coches, setCoches] = useState(initial)
  const [filtroDisc, setFiltroDisc] = useState('TODOS')
  const [filtroPlan, setFiltroPlan] = useState('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const filtrados = coches.filter(c => {
    if (filtroDisc !== 'TODOS' && c.disciplina !== filtroDisc) return false
    if (filtroPlan !== 'TODOS' && c.planMinimo !== filtroPlan) return false
    return true
  })

  function startEdit(coche: Coche) {
    setEditingId(coche.id)
    setForm({ nombre: coche.nombre, disciplina: coche.disciplina, planMinimo: coche.planMinimo, descripcion: coche.descripcion || '', modAC: coche.modAC || '', activo: coche.activo })
    setShowForm(false)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const url = editingId ? `/api/admin/coches/${editingId}` : '/api/admin/coches'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }

      toast.success(editingId ? 'Coche actualizado' : 'Coche creado')
      setShowForm(false)
      setEditingId(null)
      setForm({ ...EMPTY })
      router.refresh()
    } catch { toast.error('Error') }
    finally { setLoading(false) }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    const res = await fetch(`/api/admin/coches/${id}`, { method: 'DELETE' })
    if (res.ok) { setCoches(prev => prev.filter(c => c.id !== id)); toast.success('Eliminado') }
    else toast.error('Error al eliminar')
  }

  const InputClass = 'w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none'
  const LabelClass = 'block text-xs font-medium text-apex-muted mb-1'

  const FormCoches = () => (
    <form onSubmit={guardar} className="bg-apex-card border border-apex-border rounded-xl p-5 mb-6">
      <h3 className="font-semibold mb-4">{editingId ? 'Editar Coche' : 'Nuevo Coche'}</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className={LabelClass}>Nombre</label><input type="text" value={form.nombre} onChange={set('nombre')} required placeholder="Porsche 911 GT3" className={InputClass} /></div>
        <div><label className={LabelClass}>Disciplina</label>
          <select value={form.disciplina} onChange={set('disciplina')} className={InputClass}>
            {DISCIPLINAS.map(d => <option key={d} value={d}>{DISCIPLINA_LABELS[d]}</option>)}
          </select>
        </div>
        <div><label className={LabelClass}>Plan mínimo</label>
          <select value={form.planMinimo} onChange={set('planMinimo')} className={InputClass}>
            {PLANES.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
          </select>
        </div>
        <div><label className={LabelClass}>Mod AC (nombre)</label><input type="text" value={form.modAC || ''} onChange={set('modAC')} placeholder="kunos_porsche_911_gt3_r" className={InputClass} /></div>
        <div className="sm:col-span-2"><label className={LabelClass}>Descripción</label><input type="text" value={form.descripcion || ''} onChange={set('descripcion')} placeholder="Descripción breve del coche" className={InputClass} /></div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY }) }}
          className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text flex items-center gap-1"><X size={14} />Cancelar</button>
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Save size={14} />{loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Coche'}
        </button>
      </div>
    </form>
  )

  return (
    <div>
      {/* Filtros + añadir */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {['TODOS', ...DISCIPLINAS].map(d => (
            <button key={d} onClick={() => setFiltroDisc(d)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', filtroDisc === d ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {d === 'TODOS' ? 'Todas' : DISCIPLINA_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {['TODOS', ...PLANES].map(p => (
            <button key={p} onClick={() => setFiltroPlan(p)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', filtroPlan === p ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {p === 'TODOS' ? 'Todos' : PLAN_LABELS[p]}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY }) }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-xl text-sm font-medium hover:bg-apex-red-dark transition-colors">
          <Plus size={16} />Nuevo Coche
        </button>
      </div>

      {(showForm || editingId) && <FormCoches />}

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Coche</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Disciplina</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Plan</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden md:table-cell">Usuarios</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {filtrados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-apex-muted text-sm">No hay coches con estos filtros</td></tr>
            )}
            {filtrados.map(c => (
              <tr key={c.id} className={cn(!c.activo && 'opacity-50')}>
                <td className="px-4 py-3">
                  <div className="font-medium text-sm">{c.nombre}</div>
                  {c.modAC && <div className="text-xs text-apex-muted font-mono">{c.modAC}</div>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                    {DISCIPLINA_LABELS[c.disciplina]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', PLAN_COLORS[c.planMinimo])}>
                    {PLAN_LABELS[c.planMinimo]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm hidden md:table-cell">{c._count?.desbloqueos ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(c)} className="p-1.5 text-apex-muted hover:text-apex-text transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => eliminar(c.id, c.nombre)} className="p-1.5 text-apex-muted hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
