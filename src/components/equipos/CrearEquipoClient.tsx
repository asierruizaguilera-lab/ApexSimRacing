'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ChevronLeft, Shield } from 'lucide-react'
import { EquipoLogo } from './EquipoLogo'

const COLORES = ['#C0392B', '#E67E22', '#F1C40F', '#27AE60', '#16A085', '#2980B9', '#8E44AD', '#E91E63', '#7F8C8D', '#111111']

const INPUT = 'w-full bg-apex-surface border border-apex-border rounded-xl px-4 py-2.5 text-apex-text focus:border-apex-red/60 outline-none transition-colors text-sm'

export function CrearEquipoClient() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState(COLORES[0])
  const [loading, setLoading] = useState(false)

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion, colorPrimario: color }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al crear el equipo'); return }
      toast.success('¡Equipo creado!')
      router.push(`/equipos/${data.id}`)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/equipos" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Volver a Equipos
      </Link>
      <h1 className="text-2xl font-bold mb-1">Crear equipo</h1>
      <p className="text-apex-muted mb-6">Serás el líder: podrás invitar pilotos, inscribir al equipo en campeonatos y enviar propuestas al final de cada temporada. El logo se puede añadir después.</p>

      <form onSubmit={crear} className="bg-apex-card border border-apex-border rounded-xl p-6 space-y-5">
        {/* Vista previa */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-apex-surface border border-apex-border">
          <EquipoLogo nombre={nombre || 'Equipo'} color={color} size={56} />
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{nombre || 'Nombre del equipo'}</div>
            <div className="text-xs text-apex-muted line-clamp-1">{descripcion || 'Descripción del equipo'}</div>
          </div>
        </div>

        <div>
          <label htmlFor="nombre" className="block text-sm font-medium mb-1.5 text-apex-muted">Nombre</label>
          <input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} required minLength={3} maxLength={40}
            placeholder="APEX Racing Team" className={INPUT} />
        </div>
        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium mb-1.5 text-apex-muted">Descripción (opcional)</label>
          <textarea id="descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={500} rows={3}
            placeholder="¿Quiénes sois y a qué aspiráis?" className={`${INPUT} resize-none`} />
        </div>
        <div>
          <span className="block text-sm font-medium mb-1.5 text-apex-muted">Color del equipo</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLORES.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`}
                className={`w-8 h-8 rounded-lg border-2 transition-transform ${color.toLowerCase() === c.toLowerCase() ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c }} />
            ))}
            <label className="flex items-center gap-2 ml-2 text-xs text-apex-muted cursor-pointer">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent cursor-pointer" />
              Personalizado
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={loading || nombre.trim().length < 3}
            className="flex items-center gap-2 px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
            <Shield size={16} />{loading ? 'Creando...' : 'Crear equipo'}
          </button>
        </div>
      </form>
    </div>
  )
}
