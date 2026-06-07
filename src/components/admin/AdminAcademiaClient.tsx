'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Save, X, Eye, EyeOff } from 'lucide-react'
import { DISCIPLINA_COLORS, DISCIPLINA_LABELS, cn } from '@/lib/utils'
import { getThumbnailUrl, getEmbedUrl, extraerYouTubeId } from '@/lib/youtube'

const DISCIPLINAS = ['RALLY', 'CIRCUITO', 'DRIFT', 'KARTCROSS', 'MONOPLAZA']

interface Clase {
  id: string
  titulo: string
  descripcion: string | null
  disciplina: string
  youtubeUrl: string
  duracionMin: number | null
  orden: number
  publicada: boolean
  creadoEn: string
  totalVistas: number
}

const EMPTY = {
  titulo: '',
  descripcion: '',
  disciplina: 'RALLY',
  youtubeUrl: '',
  duracionMin: '',
  orden: '0',
  publicada: false,
}

const InputClass = 'w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none'
const LabelClass = 'block text-xs font-medium text-apex-muted mb-1'

export function AdminAcademiaClient({ clases: initial }: { clases: Clase[] }) {
  const router = useRouter()
  const [clases, setClases] = useState(initial)
  const [filtroDisc, setFiltroDisc] = useState('TODOS')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<any>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setCheck = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.checked }))

  const filtradas = clases.filter(c => {
    if (filtroDisc !== 'TODOS' && c.disciplina !== filtroDisc) return false
    if (filtroEstado === 'PUBLICADAS' && !c.publicada) return false
    if (filtroEstado === 'BORRADORES' && c.publicada) return false
    return true
  })

  function startEdit(c: Clase) {
    setEditingId(c.id)
    setForm({
      titulo: c.titulo,
      descripcion: c.descripcion || '',
      disciplina: c.disciplina,
      youtubeUrl: c.youtubeUrl,
      duracionMin: c.duracionMin?.toString() || '',
      orden: c.orden.toString(),
      publicada: c.publicada,
    })
    setShowForm(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY })
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.youtubeUrl.trim()) { toast.error('La URL de YouTube es obligatoria'); return }
    setLoading(true)
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        disciplina: form.disciplina,
        youtubeUrl: form.youtubeUrl.trim(),
        duracionMin: form.duracionMin ? Number(form.duracionMin) : null,
        orden: Number(form.orden) || 0,
        publicada: form.publicada,
      }
      const url = editingId ? `/api/admin/academia/${editingId}` : '/api/admin/academia'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al guardar'); return }

      toast.success(editingId ? 'Clase actualizada' : 'Clase creada')
      cancelForm()
      router.refresh()
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  async function togglePublicada(id: string, publicada: boolean) {
    const res = await fetch(`/api/admin/academia/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicada: !publicada }),
    })
    if (res.ok) {
      setClases(prev => prev.map(c => c.id === id ? { ...c, publicada: !publicada } : c))
      toast.success(!publicada ? 'Clase publicada' : 'Clase despublicada')
    } else toast.error('Error')
  }

  async function eliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar la clase "${titulo}"? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/admin/academia/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setClases(prev => prev.filter(c => c.id !== id))
      toast.success('Clase eliminada')
    } else toast.error('Error al eliminar')
  }

  const youtubeIdPreview = form.youtubeUrl ? extraerYouTubeId(form.youtubeUrl) : ''
  const thumbnailPreview = form.youtubeUrl ? getThumbnailUrl(form.youtubeUrl) : ''
  const embedPreview = form.youtubeUrl ? getEmbedUrl(form.youtubeUrl) : ''

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {['TODOS', ...DISCIPLINAS].map(d => (
            <button key={d} onClick={() => setFiltroDisc(d)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroDisc === d ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {d === 'TODOS' ? 'Todas' : DISCIPLINA_LABELS[d]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {[['TODOS', 'Todas'], ['PUBLICADAS', 'Publicadas'], ['BORRADORES', 'Borradores']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroEstado(v)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtroEstado === v ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY }) }}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
          <Plus size={16} />Nueva Clase
        </button>
      </div>

      {/* Formulario crear/editar */}
      {(showForm || editingId) && (
        <form onSubmit={guardar} className="bg-apex-card border border-apex-border rounded-xl p-5 mb-5 space-y-4">
          <h3 className="font-semibold">{editingId ? 'Editar Clase' : 'Nueva Clase'}</h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className={LabelClass}>Título *</label>
              <input type="text" value={form.titulo} onChange={set('titulo')} required
                placeholder="Técnica de frenada en tierra" className={InputClass} />
            </div>
            <div>
              <label className={LabelClass}>Disciplina *</label>
              <select value={form.disciplina} onChange={set('disciplina')} className={InputClass}>
                {DISCIPLINAS.map(d => <option key={d} value={d}>{DISCIPLINA_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className={LabelClass}>Duración (min)</label>
              <input type="number" value={form.duracionMin} onChange={set('duracionMin')}
                placeholder="15" min="1" className={InputClass} />
            </div>
            <div>
              <label className={LabelClass}>Orden en la disciplina</label>
              <input type="number" value={form.orden} onChange={set('orden')}
                placeholder="0" min="0" className={InputClass} />
            </div>
            <div className="flex items-center gap-3 pt-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.publicada} onChange={setCheck('publicada')} className="sr-only peer" />
                <div className="w-9 h-5 bg-apex-border rounded-full peer peer-checked:bg-apex-red transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
              <span className="text-sm text-apex-muted">Publicada</span>
            </div>
          </div>

          <div>
            <label className={LabelClass}>URL de YouTube *</label>
            <input type="text" value={form.youtubeUrl} onChange={set('youtubeUrl')} required
              placeholder="https://www.youtube.com/watch?v=... o solo el ID"
              className={InputClass} />
            {youtubeIdPreview && (
              <p className="mt-1 text-xs text-apex-muted font-mono">ID: {youtubeIdPreview}</p>
            )}
          </div>

          {/* Preview */}
          {thumbnailPreview && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-apex-muted">Preview del vídeo</p>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden max-w-md">
                <iframe
                  src={embedPreview}
                  title="Preview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}

          <div>
            <label className={LabelClass}>Descripción</label>
            <textarea value={form.descripcion} onChange={set('descripcion')} rows={3}
              placeholder="Descripción breve del contenido de la clase..."
              className={cn(InputClass, 'resize-none')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelForm}
              className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text flex items-center gap-1">
              <X size={14} />Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium disabled:opacity-50">
              <Save size={14} />{loading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Clase'}
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Clase</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden sm:table-cell">Disciplina</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted hidden md:table-cell">Duración</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden md:table-cell">Vistas</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {filtradas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-apex-muted text-sm">No hay clases con estos filtros</td></tr>
            )}
            {filtradas.map(c => (
              <tr key={c.id} className={cn(!c.publicada && 'opacity-60')}>
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-sm truncate">{c.titulo}</div>
                  {c.descripcion && <div className="text-xs text-apex-muted truncate">{c.descripcion}</div>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', DISCIPLINA_COLORS[c.disciplina])}>
                    {DISCIPLINA_LABELS[c.disciplina]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-apex-muted">
                  {c.duracionMin ? `${c.duracionMin} min` : '—'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-center text-sm">{c.totalVistas}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', c.publicada
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
                    {c.publicada ? 'Publicada' : 'Borrador'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => togglePublicada(c.id, c.publicada)}
                      title={c.publicada ? 'Despublicar' : 'Publicar'}
                      className="p-1.5 text-apex-muted hover:text-apex-text transition-colors">
                      {c.publicada ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => startEdit(c)} className="p-1.5 text-apex-muted hover:text-apex-text transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => eliminar(c.id, c.titulo)} className="p-1.5 text-apex-muted hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
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
