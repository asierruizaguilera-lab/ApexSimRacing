'use client'

import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Check, Upload, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Ubicacion = 'LANDING' | 'SIDEBAR' | 'CAMPEONATOS' | 'ACADEMIA' | 'TODAS'

const UBICACION_LABELS: Record<Ubicacion, string> = {
  LANDING: 'Landing',
  SIDEBAR: 'Sidebar',
  CAMPEONATOS: 'Campeonatos',
  ACADEMIA: 'Academia',
  TODAS: 'Todas',
}

interface Patrocinador {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  linkExterno: string | null
  ubicaciones: Ubicacion[]
  activo: boolean
  orden: number
  creadoEn: string
}

interface FormState {
  nombre: string
  descripcion: string
  logoUrl: string
  linkExterno: string
  ubicaciones: Ubicacion[]
  activo: boolean
  orden: number
  logoFile: File | null
  logoPreview: string
}

const emptyForm = (): FormState => ({
  nombre: '', descripcion: '', logoUrl: '', linkExterno: '',
  ubicaciones: [], activo: true, orden: 0, logoFile: null, logoPreview: '',
})

export function AdminPatrocinadoresClient({ initial }: { initial: Patrocinador[] }) {
  const [lista, setLista] = useState<Patrocinador[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(p: Patrocinador) {
    setEditId(p.id)
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      logoUrl: p.logoUrl || '',
      linkExterno: p.linkExterno || '',
      ubicaciones: [...p.ubicaciones],
      activo: p.activo,
      orden: p.orden,
      logoFile: null,
      logoPreview: p.logoUrl || '',
    })
    setShowForm(true)
  }

  function toggleUbicacion(u: Ubicacion) {
    setForm(f => ({
      ...f,
      ubicaciones: f.ubicaciones.includes(u)
        ? f.ubicaciones.filter(x => x !== u)
        : [...f.ubicaciones, u],
    }))
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(f => ({ ...f, logoFile: file, logoPreview: URL.createObjectURL(file) }))
  }

  async function handleSave() {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('nombre', form.nombre.trim())
      fd.append('descripcion', form.descripcion.trim())
      fd.append('linkExterno', form.linkExterno.trim())
      fd.append('ubicaciones', JSON.stringify(form.ubicaciones))
      fd.append('activo', String(form.activo))
      fd.append('orden', String(form.orden))
      if (form.logoFile) {
        fd.append('logo', form.logoFile)
      } else {
        fd.append('logoUrl', form.logoUrl)
      }

      const url = editId ? `/api/admin/patrocinadores/${editId}` : '/api/admin/patrocinadores'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, body: fd })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error guardando') }
      const saved: Patrocinador = await res.json()

      setLista(l => editId
        ? l.map(p => p.id === editId ? saved : p)
        : [...l, saved]
      )
      toast.success(editId ? 'Patrocinador actualizado' : 'Patrocinador creado')
      setShowForm(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(p: Patrocinador) {
    try {
      const res = await fetch(`/api/admin/patrocinadores/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !p.activo }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setLista(l => l.map(x => x.id === p.id ? updated : x))
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este patrocinador?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/patrocinadores/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setLista(l => l.filter(p => p.id !== id))
      toast.success('Patrocinador eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-apex-muted text-sm">{lista.length} patrocinador{lista.length !== 1 ? 'es' : ''} registrados</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-xl text-sm font-semibold hover:bg-apex-red-dark transition-colors"
        >
          <Plus size={16} /> Nuevo patrocinador
        </button>
      </div>

      {/* Tabla */}
      {lista.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl p-12 text-center text-apex-muted">
          No hay patrocinadores. Crea el primero.
        </div>
      ) : (
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-apex-surface border-b border-apex-border">
              <tr>
                <th className="text-left px-4 py-3 text-apex-muted font-medium">Logo</th>
                <th className="text-left px-4 py-3 text-apex-muted font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-apex-muted font-medium hidden md:table-cell">Ubicaciones</th>
                <th className="text-left px-4 py-3 text-apex-muted font-medium hidden sm:table-cell">Orden</th>
                <th className="text-left px-4 py-3 text-apex-muted font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-apex-muted font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apex-border">
              {lista.map(p => (
                <tr key={p.id} className="hover:bg-apex-surface/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg border border-apex-border bg-apex-surface flex items-center justify-center overflow-hidden">
                      {p.logoUrl ? (
                        <img src={p.logoUrl} alt={p.nombre} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-bold text-apex-muted">
                          {p.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-apex-text">{p.nombre}</div>
                    {p.descripcion && (
                      <div className="text-xs text-apex-muted line-clamp-1 mt-0.5">{p.descripcion}</div>
                    )}
                    {p.linkExterno && (
                      <a href={p.linkExterno} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-apex-red flex items-center gap-1 mt-0.5 hover:underline">
                        <ExternalLink size={10} />{p.linkExterno.replace(/^https?:\/\//, '').slice(0, 30)}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {p.ubicaciones.map(u => (
                        <span key={u} className="text-xs px-2 py-0.5 rounded-full bg-apex-surface border border-apex-border text-apex-muted">
                          {UBICACION_LABELS[u]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-apex-muted">{p.orden}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActivo(p)} className="flex items-center gap-1.5 text-xs">
                      {p.activo ? (
                        <><ToggleRight size={18} className="text-green-400" /><span className="text-green-400">Activo</span></>
                      ) : (
                        <><ToggleLeft size={18} className="text-apex-muted" /><span className="text-apex-muted">Inactivo</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg hover:bg-apex-surface text-apex-muted hover:text-apex-text transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-apex-muted hover:text-red-400 transition-colors disabled:opacity-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-apex-card border border-apex-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-apex-border">
              <h2 className="font-bold text-lg">{editId ? 'Editar patrocinador' : 'Nuevo patrocinador'}</h2>
              <button onClick={() => setShowForm(false)} className="text-apex-muted hover:text-apex-text p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Nombre <span className="text-apex-red">*</span></label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-apex-red/50"
                  placeholder="Nombre del patrocinador"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Descripción <span className="text-apex-muted text-xs">({form.descripcion.length}/150)</span>
                </label>
                <textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value.slice(0, 150) }))}
                  rows={2}
                  className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-apex-red/50 resize-none"
                  placeholder="Descripción corta"
                />
              </div>

              {/* Logo */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Logo</label>
                <div className="flex gap-3 items-start">
                  {(form.logoPreview || form.logoUrl) ? (
                    <div className="w-14 h-14 rounded-lg border border-apex-border bg-apex-surface flex items-center justify-center overflow-hidden shrink-0">
                      <img src={form.logoPreview || form.logoUrl} alt="preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-apex-border bg-apex-surface flex items-center justify-center shrink-0">
                      <Upload size={20} className="text-apex-muted" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full py-2 text-xs bg-apex-surface border border-apex-border rounded-lg hover:border-apex-red/40 transition-colors text-apex-muted"
                    >
                      Subir imagen
                    </button>
                    <input
                      value={form.logoUrl}
                      onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value, logoPreview: e.target.value }))}
                      className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-apex-red/50"
                      placeholder="O pega una URL de imagen"
                    />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>

              {/* Link externo */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Link externo</label>
                <input
                  value={form.linkExterno}
                  onChange={e => setForm(f => ({ ...f, linkExterno: e.target.value }))}
                  className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-apex-red/50"
                  placeholder="https://..."
                />
              </div>

              {/* Ubicaciones */}
              <div>
                <label className="block text-sm font-medium mb-2">Ubicaciones</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(UBICACION_LABELS) as Ubicacion[]).map(u => (
                    <button
                      key={u}
                      onClick={() => toggleUbicacion(u)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        form.ubicaciones.includes(u)
                          ? 'bg-apex-red text-white border-apex-red'
                          : 'bg-apex-surface text-apex-muted border-apex-border hover:border-apex-red/40'
                      )}
                    >
                      {form.ubicaciones.includes(u) && <Check size={10} className="inline mr-1" />}
                      {UBICACION_LABELS[u]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orden + Activo */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1.5">Orden</label>
                  <input
                    type="number"
                    value={form.orden}
                    onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-apex-red/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1.5">Estado</label>
                  <button
                    onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    className={cn(
                      'w-full py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
                      form.activo
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-apex-surface text-apex-muted border-apex-border'
                    )}
                  >
                    {form.activo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-apex-border">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 bg-apex-red text-white rounded-xl text-sm font-semibold hover:bg-apex-red-dark transition-colors disabled:opacity-60"
              >
                {saving ? 'Guardando...' : (editId ? 'Guardar cambios' : 'Crear patrocinador')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 bg-apex-surface text-apex-muted border border-apex-border rounded-xl text-sm hover:text-apex-text transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
