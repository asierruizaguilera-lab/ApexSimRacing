'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, Palette, Car, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/equipos/Modal'

interface CocheEquipo {
  id: string
  nombre: string
  descripcion: string | null
  imagenBase: string | null
  linkDescarga: string | null
  activo: boolean
  creadoEn: string
  temporadas: { id: string; numero: number; anio: number; activa: boolean }[]
  skins: { equipoId: string; imagenSkin: string | null; colorPrimario: string | null }[]
}

interface EquipoMini { id: string; nombre: string; colorPrimario: string | null }

const INPUT = 'w-full bg-apex-surface border border-apex-border rounded-xl px-3 py-2.5 text-sm focus:border-apex-red outline-none transition-colors'
const VACIO = { nombre: '', descripcion: '', imagenBase: '', linkDescarga: '' }

export function AdminGarajeEquipoClient({ coches, equipos }: { coches: CocheEquipo[]; equipos: EquipoMini[] }) {
  const router = useRouter()
  const [editando, setEditando] = useState<CocheEquipo | 'nuevo' | null>(null)
  const [skins, setSkins] = useState<CocheEquipo | null>(null)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const cerrar = useCallback(() => { setEditando(null); setSkins(null) }, [])

  function abrir(c: CocheEquipo | 'nuevo') {
    setForm(c === 'nuevo' ? VACIO : {
      nombre: c.nombre, descripcion: c.descripcion ?? '', imagenBase: c.imagenBase ?? '', linkDescarga: c.linkDescarga ?? '',
    })
    setEditando(c)
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const nuevo = editando === 'nuevo'
      const res = await fetch(nuevo ? '/api/admin/garaje-equipo' : `/api/admin/garaje-equipo/${(editando as CocheEquipo).id}`, {
        method: nuevo ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(nuevo ? 'Coche creado' : 'Coche actualizado')
      cerrar()
      router.refresh()
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar(c: CocheEquipo) {
    if (!confirm(`¿Eliminar ${c.nombre}?${c.temporadas.length ? ' Se ha usado en temporadas: se desactivará para conservar el histórico.' : ''}`)) return
    const res = await fetch(`/api/admin/garaje-equipo/${c.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Error'); return }
    toast.success(data.desactivado ? 'Coche desactivado' : 'Coche eliminado')
    router.refresh()
  }

  async function reactivar(c: CocheEquipo) {
    const res = await fetch(`/api/admin/garaje-equipo/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: true }),
    })
    if (res.ok) { toast.success('Coche reactivado'); router.refresh() }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => abrir('nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} />Nuevo coche de equipo
        </button>
      </div>

      {coches.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl py-16 text-center text-apex-muted">
          <Car size={44} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay coches de equipo. Crea el primero para poder asignarlo a una temporada.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {coches.map(c => (
            <div key={c.id} className={cn('bg-apex-card border border-apex-border rounded-xl overflow-hidden', !c.activo && 'opacity-60')}>
              <div className="h-40 bg-apex-surface flex items-center justify-center">
                {c.imagenBase ? <img src={c.imagenBase} alt={c.nombre} className="w-full h-full object-contain" /> : <Car size={48} className="text-apex-muted" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{c.nombre}</h3>
                  {!c.activo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">Inactivo</span>}
                </div>
                {c.descripcion && <p className="text-xs text-apex-muted mt-1 line-clamp-2">{c.descripcion}</p>}
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.temporadas.map(t => (
                    <span key={t.id} className={cn('text-[10px] px-1.5 py-0.5 rounded-full border',
                      t.activa ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-apex-surface text-apex-muted border-apex-border')}>
                      T{t.numero} {t.anio}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-apex-muted mt-2">{c.skins.length} skin{c.skins.length === 1 ? '' : 's'} de equipo</div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setSkins(c)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg bg-apex-surface border border-apex-border hover:border-apex-red/40 transition-colors">
                    <Palette size={13} />Skins
                  </button>
                  {c.linkDescarga && (
                    <a href={c.linkDescarga} target="_blank" rel="noopener noreferrer" title="Link del mod"
                      className="p-1.5 rounded-lg bg-apex-surface border border-apex-border hover:border-apex-red/40 transition-colors"><Download size={13} /></a>
                  )}
                  <button onClick={() => abrir(c)} title="Editar"
                    className="p-1.5 rounded-lg bg-apex-surface border border-apex-border hover:border-apex-red/40 transition-colors"><Pencil size={13} /></button>
                  {c.activo ? (
                    <button onClick={() => eliminar(c)} title="Eliminar"
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"><Trash2 size={13} /></button>
                  ) : (
                    <button onClick={() => reactivar(c)} className="text-xs px-2 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30">Reactivar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <Modal titulo={editando === 'nuevo' ? 'Nuevo coche de equipo' : `Editar ${editando.nombre}`} onClose={cerrar}>
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label htmlFor="ce-nombre" className="block text-sm text-apex-muted mb-1.5">Nombre</label>
              <input id="ce-nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required className={INPUT} placeholder="Honda Civic Type R 2025" />
            </div>
            <div>
              <label htmlFor="ce-desc" className="block text-sm text-apex-muted mb-1.5">Descripción</label>
              <textarea id="ce-desc" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={`${INPUT} resize-none`} />
            </div>
            <div>
              <label htmlFor="ce-img" className="block text-sm text-apex-muted mb-1.5">URL imagen base (sin skin)</label>
              <input id="ce-img" type="url" value={form.imagenBase} onChange={e => setForm(f => ({ ...f, imagenBase: e.target.value }))} className={INPUT} placeholder="https://..." />
            </div>
            <div>
              <label htmlFor="ce-link" className="block text-sm text-apex-muted mb-1.5">Link de descarga del mod</label>
              <input id="ce-link" type="url" value={form.linkDescarga} onChange={e => setForm(f => ({ ...f, linkDescarga: e.target.value }))} className={INPUT} placeholder="https://drive.google.com/..." />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={guardando}
                className="px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {skins && <SkinsModal coche={skins} equipos={equipos} onClose={cerrar} onSaved={() => router.refresh()} />}
    </div>
  )
}

function SkinsModal({ coche, equipos, onClose, onSaved }: {
  coche: CocheEquipo
  equipos: EquipoMini[]
  onClose: () => void
  onSaved: () => void
}) {
  const inicial = Object.fromEntries(equipos.map(e => {
    const s = coche.skins.find(x => x.equipoId === e.id)
    return [e.id, { imagenSkin: s?.imagenSkin ?? '', colorPrimario: s?.colorPrimario ?? '' }]
  }))
  const [valores, setValores] = useState<Record<string, { imagenSkin: string; colorPrimario: string }>>(inicial)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [conSkin, setConSkin] = useState<Set<string>>(new Set(coche.skins.map(s => s.equipoId)))

  async function guardar(equipoId: string, v = valores[equipoId]) {
    setGuardando(equipoId)
    try {
      const res = await fetch('/api/admin/garaje-equipo/skins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cocheEquipoId: coche.id, equipoId, ...v }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      setConSkin(prev => {
        const n = new Set(prev)
        if (data.eliminada) n.delete(equipoId); else n.add(equipoId)
        return n
      })
      toast.success(data.eliminada ? 'Skin eliminada: usará el color del equipo' : 'Skin guardada')
      onSaved()
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Modal titulo={`Skins — ${coche.nombre}`} onClose={onClose} ancho="max-w-2xl">
      <p className="text-sm text-apex-muted mb-4">Sube la skin de cada equipo o déjala vacía para que usen su color de equipo sobre la imagen base.</p>
      {equipos.length === 0 ? (
        <p className="text-sm text-apex-muted">No hay equipos activos.</p>
      ) : (
        <div className="space-y-3">
          {equipos.map(e => {
            const v = valores[e.id]
            const tieneSkin = conSkin.has(e.id)
            return (
              <div key={e.id} className="p-3 rounded-xl bg-apex-surface border border-apex-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: v.colorPrimario || e.colorPrimario || '#C0392B' }} />
                  <span className="font-medium text-sm flex-1">{e.nombre}</span>
                  <span className="text-[10px] text-apex-muted">{tieneSkin ? 'Skin personalizada' : 'Color del equipo'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input type="url" value={v.imagenSkin} placeholder="URL de la skin (opcional)" aria-label={`Skin de ${e.nombre}`}
                    onChange={ev => setValores(p => ({ ...p, [e.id]: { ...p[e.id], imagenSkin: ev.target.value } }))}
                    className={cn(INPUT, 'flex-1 min-w-[200px] py-2')} />
                  <input type="color" value={v.colorPrimario || e.colorPrimario || '#C0392B'} aria-label={`Color de skin de ${e.nombre}`}
                    onChange={ev => setValores(p => ({ ...p, [e.id]: { ...p[e.id], colorPrimario: ev.target.value } }))}
                    className="w-11 h-10 rounded-lg bg-transparent cursor-pointer" />
                  <button onClick={() => guardar(e.id)} disabled={guardando === e.id}
                    className="px-3 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    Guardar
                  </button>
                  {tieneSkin && (
                    <button onClick={() => {
                      const vacio = { imagenSkin: '', colorPrimario: '' }
                      setValores(p => ({ ...p, [e.id]: vacio }))
                      guardar(e.id, vacio)
                    }}
                      className="px-3 py-2 text-xs text-apex-muted hover:text-red-400">Quitar</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
