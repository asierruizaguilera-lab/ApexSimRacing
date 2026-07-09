'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronLeft, Send, Flag } from 'lucide-react'

interface Carrera {
  id: string; nombre: string; circuito: string
  campeonato: { id: string; nombre: string }
  pilotos: { id: string; username: string }[]
}

const InputClass = 'w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none'
const LabelClass = 'block text-xs font-medium text-apex-muted mb-1'

export function NuevaIncidenciaClient({ carrera }: { carrera: Carrera | null }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [denunciadoId, setDenunciadoId] = useState('')
  const [vuelta, setVuelta] = useState('')
  const [linkRepeticion, setLinkRepeticion] = useState('')
  const [loading, setLoading] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/incidencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: carrera ? 'INCIDENCIA_CARRERA' : 'QUEJA_GENERAL',
          titulo,
          descripcion,
          denunciadoId: denunciadoId || undefined,
          carreraId: carrera?.id,
          vuelta: carrera && vuelta ? Number(vuelta) : undefined,
          linkRepeticion: carrera ? linkRepeticion || undefined : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al enviar la incidencia'); return }

      toast.success('Incidencia enviada correctamente')
      router.push(`/incidencias/${data.id}`)
    } catch {
      toast.error('Error al enviar la incidencia')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/incidencias" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Volver a Mis Incidencias
      </Link>

      {carrera && (
        <div className="bg-apex-card border border-apex-border rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-apex-red/10 flex items-center justify-center flex-shrink-0">
            <Flag size={16} className="text-apex-red" />
          </div>
          <div>
            <div className="font-medium text-sm">{carrera.nombre}</div>
            <div className="text-xs text-apex-muted">{carrera.campeonato.nombre} · {carrera.circuito}</div>
          </div>
        </div>
      )}

      <form onSubmit={enviar} className="bg-apex-card border border-apex-border rounded-xl p-5 space-y-4">
        <div>
          <label className={LabelClass}>Título</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required
            placeholder={carrera ? 'Ej: Toque en curva 3, vuelta 5' : 'Resumen breve del problema'}
            className={InputClass} maxLength={120} />
        </div>

        <div>
          <label className={LabelClass}>Descripción</label>
          <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} required rows={5}
            placeholder="Describe lo ocurrido con el mayor detalle posible"
            className={InputClass} />
        </div>

        {carrera && carrera.pilotos.length > 0 && (
          <div>
            <label className={LabelClass}>Piloto implicado (opcional)</label>
            <select value={denunciadoId} onChange={e => setDenunciadoId(e.target.value)} className={InputClass}>
              <option value="">Ninguno en particular</option>
              {carrera.pilotos.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
            </select>
          </div>
        )}

        {carrera && (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={LabelClass}>Vuelta (opcional)</label>
              <input type="number" min={1} value={vuelta} onChange={e => setVuelta(e.target.value)}
                placeholder="5" className={InputClass} />
            </div>
            <div>
              <label className={LabelClass}>Link a repetición/vídeo (opcional)</label>
              <input type="url" value={linkRepeticion} onChange={e => setLinkRepeticion(e.target.value)}
                placeholder="https://..." className={InputClass} />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-apex-red text-white rounded-xl text-sm font-medium hover:bg-apex-red-dark transition-colors disabled:opacity-50">
            <Send size={14} />{loading ? 'Enviando...' : 'Enviar Incidencia'}
          </button>
        </div>
      </form>
    </div>
  )
}
