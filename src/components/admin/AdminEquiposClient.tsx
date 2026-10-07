'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Crown, MessageSquare, Trash2, UserCog, Search } from 'lucide-react'
import { cn, formatFecha } from '@/lib/utils'
import { EquipoLogo } from '@/components/equipos/EquipoLogo'
import { EquipoChat, type MensajeEquipo } from '@/components/equipos/EquipoChat'
import { Modal } from '@/components/equipos/Modal'

interface EquipoAdmin {
  id: string
  nombre: string
  colorPrimario: string | null
  logoUrl: string | null
  activo: boolean
  creadoEn: string
  lider: { id: string; username: string }
  miembros: { userId: string; rol: string; user: { id: string; username: string; avatar: string | null } }[]
  puntosMes: number
  totalMensajes: number
}

export function AdminEquiposClient({ equipos, adminId }: { equipos: EquipoAdmin[]; adminId: string }) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<'ACTIVOS' | 'DISUELTOS' | 'TODOS'>('ACTIVOS')
  const [q, setQ] = useState('')
  const [chat, setChat] = useState<{ equipo: EquipoAdmin; mensajes: MensajeEquipo[] } | null>(null)
  const [lider, setLider] = useState<EquipoAdmin | null>(null)
  const [disolver, setDisolver] = useState<EquipoAdmin | null>(null)
  const [nuevoLider, setNuevoLider] = useState('')
  const [busy, setBusy] = useState(false)
  const cerrar = useCallback(() => { setChat(null); setLider(null); setDisolver(null) }, [])

  const lista = equipos
    .filter(e => filtro === 'TODOS' || (filtro === 'ACTIVOS' ? e.activo : !e.activo))
    .filter(e => !q.trim() || e.nombre.toLowerCase().includes(q.trim().toLowerCase()))

  async function verChat(e: EquipoAdmin) {
    const res = await fetch(`/api/equipos/${e.id}/chat`)
    if (!res.ok) { toast.error('No se pudo cargar el chat'); return }
    setChat({ equipo: e, mensajes: await res.json() })
  }

  async function accion(equipoId: string, body: object, ok: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/equipos/${equipoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(ok)
      cerrar()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-lg p-1">
          {(['ACTIVOS', 'DISUELTOS', 'TODOS'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text')}>
              {f === 'ACTIVOS' ? 'Activos' : f === 'DISUELTOS' ? 'Disueltos' : 'Todos'}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apex-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar equipo..." aria-label="Buscar equipo"
            className="bg-apex-card border border-apex-border rounded-lg pl-8 pr-3 py-2 text-sm focus:border-apex-red outline-none" />
        </div>
      </div>

      <div className="bg-apex-card border border-apex-border rounded-xl overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Equipo</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Estado</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Miembros</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Pts mes</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {lista.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-apex-muted text-sm">No hay equipos</td></tr>
            )}
            {lista.map(e => (
              <tr key={e.id}>
                <td className="px-4 py-3">
                  <Link href={`/equipos/${e.id}`} className="flex items-center gap-3 hover:text-apex-red transition-colors">
                    <EquipoLogo nombre={e.nombre} logoUrl={e.logoUrl} color={e.colorPrimario} size={36} className="rounded-lg" />
                    <div>
                      <div className="font-medium text-sm">{e.nombre}</div>
                      <div className="text-xs text-apex-muted">Creado {formatFecha(e.creadoEn)} · líder {e.lider.username}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border', e.activo
                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/30')}>
                    {e.activo ? 'Activo' : 'Disuelto'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {e.miembros.map(m => (
                      <span key={m.userId} className="flex items-center gap-1 text-xs bg-apex-surface border border-apex-border rounded-full px-2 py-0.5">
                        {m.rol === 'LIDER' && <Crown size={10} className="text-yellow-400" />}{m.user.username}
                      </span>
                    ))}
                    {e.miembros.length === 0 && <span className="text-xs text-apex-muted">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-apex-red">{e.puntosMes}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => verChat(e)} title="Ver chat (moderación)"
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-apex-surface border border-apex-border hover:border-apex-red/40 transition-colors">
                      <MessageSquare size={13} />{e.totalMensajes}
                    </button>
                    {e.activo && (
                      <>
                        <button onClick={() => { setNuevoLider(''); setLider(e) }} title="Cambiar líder" disabled={e.miembros.length < 2}
                          className="p-1.5 rounded-lg bg-apex-surface border border-apex-border hover:border-apex-red/40 transition-colors disabled:opacity-40">
                          <UserCog size={14} />
                        </button>
                        <button onClick={() => setDisolver(e)} title="Disolver equipo"
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chat && (
        <Modal titulo={`Chat de ${chat.equipo.nombre}`} onClose={cerrar} ancho="max-w-2xl">
          <EquipoChat
            equipoId={chat.equipo.id}
            color={chat.equipo.colorPrimario || '#C0392B'}
            liderId={chat.equipo.lider.id}
            initialMessages={chat.mensajes}
            currentUserId={adminId}
            puedeEscribir={false}
            moderador
            className="h-[60vh]"
          />
        </Modal>
      )}

      {lider && (
        <Modal titulo={`Cambiar líder de ${lider.nombre}`} onClose={cerrar} ancho="max-w-md">
          <label htmlFor="nuevo-lider" className="block text-sm text-apex-muted mb-2">Nuevo líder</label>
          <select id="nuevo-lider" value={nuevoLider} onChange={e => setNuevoLider(e.target.value)}
            className="w-full bg-apex-surface border border-apex-border rounded-xl px-3 py-2.5 text-sm focus:border-apex-red outline-none mb-4">
            <option value="">Selecciona un piloto</option>
            {lider.miembros.filter(m => m.userId !== lider.lider.id).map(m => (
              <option key={m.userId} value={m.userId}>{m.user.username}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text">Cancelar</button>
            <button disabled={!nuevoLider || busy}
              onClick={() => accion(lider.id, { accion: 'CAMBIAR_LIDER', nuevoLiderId: nuevoLider }, 'Líder actualizado')}
              className="px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              Cambiar líder
            </button>
          </div>
        </Modal>
      )}

      {disolver && (
        <Modal titulo={`Disolver ${disolver.nombre}`} onClose={cerrar} ancho="max-w-md">
          <p className="text-sm text-apex-muted mb-5">
            Sus {disolver.miembros.length} pilotos quedarán libres, se cancelarán sus invitaciones e inscripciones pendientes y el equipo
            dejará de aparecer en la liga. Su histórico de puntos y temporadas se conserva. No se puede deshacer.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text">Cancelar</button>
            <button disabled={busy} onClick={() => accion(disolver.id, { accion: 'DISOLVER' }, 'Equipo disuelto')}
              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 disabled:opacity-50">
              Disolver equipo
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
