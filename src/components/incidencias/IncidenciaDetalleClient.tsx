'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ChevronLeft, Flag, MessageSquareWarning, Paperclip, Send, Settings, ShieldAlert } from 'lucide-react'
import {
  cn, formatFecha, formatFechaHora,
  TIPO_QUEJA_LABELS, ESTADO_QUEJA_LABELS, ESTADO_QUEJA_COLORS,
  TIPO_SANCION_LABELS, TIPO_SANCION_COLORS,
} from '@/lib/utils'

interface UsuarioMini { id: string; username: string; avatar: string | null }
interface Prueba {
  id: string; descripcion: string; linkPrueba: string | null; creadoEn: string
  user: UsuarioMini
}

interface Queja {
  id: string; tipo: string; estado: string; titulo: string; descripcion: string
  vuelta: number | null; linkRepeticion: string | null
  resolucion: string | null; sancion: string | null
  puntosPenalizados: number | null; diasSuspension: number | null
  fechaResolucion: string | null; resueltaPorUsername: string | null
  creadoEn: string
  denunciante: UsuarioMini
  denunciado: UsuarioMini | null
  carrera: { id: string; nombre: string; circuito: string; fecha: string; campeonato: { id: string; nombre: string } } | null
  pruebas: Prueba[]
}

function Avatar({ user }: { user: UsuarioMini }) {
  return user.avatar ? (
    <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {user.username.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function IncidenciaDetalleClient({ queja: q, userId, isAdmin }: { queja: Queja; userId: string; isAdmin: boolean }) {
  const router = useRouter()
  const [descPrueba, setDescPrueba] = useState('')
  const [linkPrueba, setLinkPrueba] = useState('')
  const [loading, setLoading] = useState(false)

  const cerrada = q.estado === 'RESUELTA' || q.estado === 'ARCHIVADA'

  async function añadirPrueba(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/incidencias/${q.id}/pruebas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: descPrueba, linkPrueba: linkPrueba || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al añadir la prueba'); return }
      toast.success('Prueba añadida')
      setDescPrueba('')
      setLinkPrueba('')
      router.refresh()
    } catch {
      toast.error('Error al añadir la prueba')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Link href="/incidencias" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm mb-4 transition-colors">
        <ChevronLeft size={16} />Volver a Mis Incidencias
      </Link>

      <div className="bg-apex-card border border-apex-border rounded-xl p-6 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-apex-surface border-apex-border text-apex-muted flex items-center gap-1">
            {q.tipo === 'INCIDENCIA_CARRERA' ? <Flag size={10} /> : <MessageSquareWarning size={10} />}
            {TIPO_QUEJA_LABELS[q.tipo]}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_QUEJA_COLORS[q.estado])}>
            {ESTADO_QUEJA_LABELS[q.estado]}
          </span>
          {isAdmin && (
            <Link href={`/admin/incidencias?q=${q.id}`}
              className="ml-auto flex items-center gap-1.5 text-xs text-apex-red hover:underline">
              <Settings size={12} />Gestionar en Panel Admin
            </Link>
          )}
        </div>
        <h1 className="text-xl font-bold mb-1">{q.titulo}</h1>
        <p className="text-xs text-apex-muted mb-4">Reportada el {formatFechaHora(q.creadoEn)}</p>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Avatar user={q.denunciante} />
            <div>
              <div className="text-xs text-apex-muted">Denunciante</div>
              <div className="text-sm font-medium">{q.denunciante.username}{q.denunciante.id === userId && ' (Tú)'}</div>
            </div>
          </div>
          {q.denunciado && (
            <div className="flex items-center gap-2">
              <Avatar user={q.denunciado} />
              <div>
                <div className="text-xs text-apex-muted">Denunciado</div>
                <div className="text-sm font-medium">{q.denunciado.username}{q.denunciado.id === userId && ' (Tú)'}</div>
              </div>
            </div>
          )}
        </div>

        {q.carrera && (
          <Link href={`/campeonatos/${q.carrera.campeonato.id}`}
            className="flex items-center gap-2 bg-apex-surface border border-apex-border rounded-lg px-3 py-2 mb-4 text-sm hover:border-apex-red/30 transition-colors w-fit">
            <Flag size={14} className="text-apex-red" />
            <span>{q.carrera.campeonato.nombre} — {q.carrera.nombre}</span>
            {q.vuelta && <span className="text-apex-muted">· Vuelta {q.vuelta}</span>}
          </Link>
        )}

        <div className="mb-2">
          <h3 className="text-sm font-semibold mb-1.5">Descripción</h3>
          <p className="text-apex-muted text-sm whitespace-pre-wrap leading-relaxed">{q.descripcion}</p>
        </div>

        {q.linkRepeticion && (
          <a href={q.linkRepeticion} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-sm text-apex-red hover:underline">
            📺 Ver repetición del incidente
          </a>
        )}
      </div>

      {/* Resolución */}
      {(q.estado === 'RESUELTA' || q.estado === 'ARCHIVADA') && (
        <div className="bg-apex-card border border-apex-border rounded-xl p-6 mb-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-apex-red" />Resolución
          </h3>
          {q.resolucion && <p className="text-apex-muted text-sm whitespace-pre-wrap leading-relaxed mb-3">{q.resolucion}</p>}
          {q.sancion && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full border', TIPO_SANCION_COLORS[q.sancion])}>
                {TIPO_SANCION_LABELS[q.sancion]}
              </span>
              {q.sancion === 'PENALIZACION_PUNTOS' && q.puntosPenalizados && (
                <span className="text-xs text-apex-muted">-{q.puntosPenalizados} pts</span>
              )}
              {q.sancion === 'SUSPENSION_TEMPORAL' && q.diasSuspension && (
                <span className="text-xs text-apex-muted">{q.diasSuspension} días</span>
              )}
            </div>
          )}
          <p className="text-xs text-apex-muted">
            {q.resueltaPorUsername ? `Resuelto por ${q.resueltaPorUsername}` : 'Resuelto'}
            {q.fechaResolucion && ` · ${formatFecha(q.fechaResolucion)}`}
          </p>
        </div>
      )}

      {/* Pruebas */}
      <div className="bg-apex-card border border-apex-border rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
          <Paperclip size={14} />Pruebas aportadas ({q.pruebas.length})
        </h3>

        {q.pruebas.length === 0 ? (
          <p className="text-sm text-apex-muted mb-4">Todavía no se han aportado pruebas</p>
        ) : (
          <div className="space-y-3 mb-4">
            {q.pruebas.map(p => (
              <div key={p.id} className="bg-apex-surface border border-apex-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Avatar user={p.user} />
                  <div>
                    <div className="text-sm font-medium">{p.user.username}{p.user.id === userId && ' (Tú)'}</div>
                    <div className="text-xs text-apex-muted">{formatFechaHora(p.creadoEn)}</div>
                  </div>
                </div>
                <p className="text-sm text-apex-muted whitespace-pre-wrap">{p.descripcion}</p>
                {p.linkPrueba && (
                  <a href={p.linkPrueba} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-apex-red hover:underline">
                    🔗 Ver prueba
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!cerrada ? (
          <form onSubmit={añadirPrueba} className="border-t border-apex-border pt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-apex-muted mb-1">Añadir prueba</label>
              <textarea value={descPrueba} onChange={e => setDescPrueba(e.target.value)} required rows={3}
                placeholder="Describe la prueba que aportas"
                className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-apex-muted mb-1">Link (opcional)</label>
              <input type="url" value={linkPrueba} onChange={e => setLinkPrueba(e.target.value)}
                placeholder="https://..."
                className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2 text-sm focus:border-apex-red focus:outline-none" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-lg text-sm font-medium hover:bg-apex-red-dark transition-colors disabled:opacity-50">
                <Send size={14} />{loading ? 'Enviando...' : 'Añadir Prueba'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-apex-muted border-t border-apex-border pt-4">Esta incidencia está cerrada, ya no se pueden aportar más pruebas</p>
        )}
      </div>
    </div>
  )
}
