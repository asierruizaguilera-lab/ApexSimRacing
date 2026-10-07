'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  ChevronLeft, Crown, UserPlus, Settings, Car, LogOut, Trophy, Users, Send, MessageSquare, Lightbulb, UserMinus,
} from 'lucide-react'
import { cn, formatFecha, getPaisFlag, MAX_MIEMBROS_EQUIPO as MAX_MIEMBROS } from '@/lib/utils'
import { getSocket } from '@/lib/socketClient'
import { EquipoLogo, Avatar } from './EquipoLogo'
import { EquipoChat, type MensajeEquipo } from './EquipoChat'
import { BuscadorUsuarios } from './BuscadorUsuarios'
import { Modal } from './Modal'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const INPUT = 'w-full bg-apex-surface border border-apex-border rounded-xl px-4 py-2.5 text-apex-text focus:border-apex-red/60 outline-none transition-colors text-sm'

interface Miembro {
  userId: string
  rol: string
  fechaUnion: string
  puntosMes: number
  puntosEquipo: number
  user: { id: string; username: string; avatar: string | null; pais: string | null; totalPuntos: number }
}

interface Equipo {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  colorPrimario: string | null
  activo: boolean
  liderId: string
  creadoEn: string
  puntosMesActual: number
  posicionMes: number | null
  totalEquipos: number
  temporada: string | null
  miembros: Miembro[]
  historico: { mes: number; anio: number; puntos: number }[]
  propuesta: { titulo: string; estado: string; respuestaAdmin: string | null } | null
}

interface Props {
  equipo: Equipo
  mensajes: MensajeEquipo[]
  invitacionesPendientes: { id: string; username: string }[]
  currentUserId: string
  esMiembro: boolean
  esLider: boolean
  ventanaPropuestas: boolean
}

const ESTADO_PROPUESTA: Record<string, { label: string; cls: string }> = {
  PENDIENTE: { label: 'Pendiente', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  REVISANDO: { label: 'En revisión', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  ACEPTADA: { label: 'Aceptada', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  RECHAZADA: { label: 'Rechazada', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function EquipoDetalleClient({ equipo, mensajes, invitacionesPendientes, currentUserId, esMiembro, esLider, ventanaPropuestas }: Props) {
  const router = useRouter()
  const color = equipo.colorPrimario || '#C0392B'
  const [modal, setModal] = useState<'invitar' | 'gestionar' | 'propuesta' | 'salir' | null>(null)
  const [invitados, setInvitados] = useState<Set<string>>(new Set(invitacionesPendientes.map(i => i.username)))
  const [busy, setBusy] = useState(false)
  const cerrar = useCallback(() => setModal(null), [])

  // Cambios del equipo hechos por otros miembros (altas, bajas, edición) → recargar datos del servidor
  useEffect(() => {
    if (!esMiembro) return
    const s = getSocket()
    const recargar = ({ id }: { id: string }) => { if (id === equipo.id) router.refresh() }
    const disuelto = ({ id }: { id: string }) => {
      if (id !== equipo.id) return
      toast('El equipo se ha disuelto')
      router.push('/equipos')
      router.refresh()
    }
    s.on('equipo:actualizado', recargar)
    s.on('equipo:disuelto', disuelto)
    return () => { s.off('equipo:actualizado', recargar); s.off('equipo:disuelto', disuelto) }
  }, [esMiembro, equipo.id, router])

  const datosGrafica = equipo.historico.map(p => ({
    label: `${MESES_CORTOS[p.mes - 1]} ${String(p.anio).slice(2)}`,
    puntos: p.puntos,
  }))

  async function invitar(userId: string, username: string) {
    const res = await fetch(`/api/equipos/${equipo.id}/invitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Error al invitar'); return }
    setInvitados(prev => new Set(prev).add(username))
    toast.success(`Invitación enviada a ${username}`)
  }

  async function salir() {
    setBusy(true)
    try {
      const res = await fetch(`/api/equipos/${equipo.id}/salir`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      toast.success(data.disuelto ? 'Equipo disuelto' : 'Has salido del equipo')
      router.push('/equipos')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/equipos" className="inline-flex items-center gap-1 text-apex-muted hover:text-apex-text text-sm transition-colors">
        <ChevronLeft size={16} />Volver a Equipos
      </Link>

      {/* Header */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <div className="h-24 sm:h-28" style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}55 45%, #1C1C1C 100%)` }} />
        <div className="px-5 pb-5 -mt-10 flex flex-col sm:flex-row sm:items-end gap-4">
          <EquipoLogo nombre={equipo.nombre} logoUrl={equipo.logoUrl} color={color} size={84} className="rounded-2xl border-4 border-apex-card shadow-xl" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{equipo.nombre}</h1>
              {!equipo.activo && <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-500/20 text-gray-400 border-gray-500/30">Disuelto</span>}
            </div>
            {equipo.descripcion && <p className="text-apex-muted text-sm mt-1 whitespace-pre-wrap">{equipo.descripcion}</p>}
            <p className="text-xs text-apex-muted mt-1">Fundado el {formatFecha(equipo.creadoEn)}{equipo.temporada ? ` · ${equipo.temporada}` : ''}</p>
          </div>
          {equipo.activo && esMiembro && (
            <div className="flex flex-wrap gap-2">
              {esLider && (
                <>
                  <button onClick={() => setModal('invitar')}
                    className="flex items-center gap-2 px-3 py-2 text-white rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: color }}>
                    <UserPlus size={15} />Invitar piloto
                  </button>
                  <button onClick={() => setModal('gestionar')}
                    className="flex items-center gap-2 px-3 py-2 bg-apex-surface border border-apex-border hover:border-apex-red/40 rounded-xl text-sm transition-colors">
                    <Settings size={15} />Gestionar equipo
                  </button>
                </>
              )}
              <Link href="/equipos/garaje"
                className="flex items-center gap-2 px-3 py-2 bg-apex-surface border border-apex-border hover:border-apex-red/40 rounded-xl text-sm transition-colors">
                <Car size={15} />Ver garaje de equipo
              </Link>
              <button onClick={() => setModal('salir')}
                className="flex items-center gap-2 px-3 py-2 bg-apex-surface border border-apex-border text-apex-muted hover:text-red-400 hover:border-red-500/30 rounded-xl text-sm transition-colors">
                <LogOut size={15} />Salir del equipo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Puntos este mes', value: equipo.puntosMesActual, icon: Trophy, cls: 'text-yellow-400' },
          { label: 'Posición del mes', value: equipo.posicionMes && equipo.puntosMesActual > 0 ? `#${equipo.posicionMes} de ${equipo.totalEquipos}` : '—', icon: Trophy, cls: 'text-apex-red' },
          { label: 'Pilotos', value: `${equipo.miembros.length}/${MAX_MIEMBROS}`, icon: Users, cls: 'text-blue-400' },
          { label: 'Puntos históricos', value: equipo.historico.reduce((s, p) => s + p.puntos, 0), icon: Trophy, cls: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-apex-card border border-apex-border rounded-xl p-4">
            <s.icon size={18} className={cn('mb-2', s.cls)} />
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-apex-muted text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Propuesta de fin de temporada (líder) */}
      {esLider && equipo.activo && (equipo.propuesta || ventanaPropuestas) && (
        <div className="bg-apex-card border border-apex-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Lightbulb size={20} className="text-yellow-400 flex-shrink-0" />
          {equipo.propuesta ? (
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Propuesta de esta temporada: {equipo.propuesta.titulo}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_PROPUESTA[equipo.propuesta.estado]?.cls)}>
                  {ESTADO_PROPUESTA[equipo.propuesta.estado]?.label}
                </span>
              </div>
              {equipo.propuesta.respuestaAdmin && (
                <p className="text-sm text-apex-muted mt-1"><strong className="text-apex-text">Respuesta del admin:</strong> {equipo.propuesta.respuestaAdmin}</p>
              )}
            </div>
          ) : (
            <>
              <p className="flex-1 text-sm text-apex-muted">Último mes de la temporada: puedes enviar <strong className="text-apex-text">una propuesta</strong> a la organización (coche, circuito, formato...).</p>
              <button onClick={() => setModal('propuesta')}
                className="px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
                Enviar propuesta
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Miembros */}
          <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-apex-border flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2"><Users size={16} />Pilotos</h2>
              <span className="text-xs text-apex-muted">pts mes / pts aportados</span>
            </div>
            {equipo.miembros.length === 0 ? (
              <div className="px-4 py-8 text-center text-apex-muted text-sm">Este equipo no tiene pilotos</div>
            ) : (
              <div className="divide-y divide-apex-border/50">
                {equipo.miembros.map(m => (
                  <div key={m.userId} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/perfil/${m.user.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:text-apex-red transition-colors">
                      <Avatar username={m.user.username} avatar={m.user.avatar} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">{m.user.username}</span>
                          <span className="text-xs">{getPaisFlag(m.user.pais)}</span>
                          {m.userId === equipo.liderId && <Crown size={13} style={{ color }} aria-label="Líder" />}
                        </div>
                        <div className="text-xs text-apex-muted">Desde {formatFecha(m.fechaUnion)}</div>
                      </div>
                    </Link>
                    <div className="text-right text-sm">
                      <span className="font-bold" style={{ color }}>{m.puntosMes}</span>
                      <span className="text-apex-muted"> / {m.puntosEquipo}</span>
                    </div>
                    {m.userId !== currentUserId && (
                      <Link href={`/mensajes/${m.userId}`} title={`Enviar mensaje a ${m.user.username}`}
                        className="text-apex-muted hover:text-apex-text transition-colors">
                        <MessageSquare size={15} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráfica */}
          <div className="bg-apex-card border border-apex-border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Puntos por mes</h2>
            {datosGrafica.length === 0 ? (
              <p className="text-sm text-apex-muted text-center py-8">Aún no hay puntos en campeonatos de equipos</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGrafica} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#ffffff0d' }}
                      contentStyle={{ background: '#2A2A2A', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: '#F5F5F5' }}
                      formatter={(v: number) => [`${v} pts`, 'Puntos']}
                    />
                    <Bar dataKey="puntos" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-3">
          {esMiembro && equipo.activo ? (
            <EquipoChat
              equipoId={equipo.id}
              color={color}
              liderId={equipo.liderId}
              initialMessages={mensajes}
              currentUserId={currentUserId}
              puedeEscribir
              className="h-[560px]"
            />
          ) : (
            <div className="bg-apex-card border border-apex-border rounded-xl p-8 text-center text-apex-muted h-full flex flex-col items-center justify-center">
              <MessageSquare size={36} className="opacity-30 mb-3" />
              <p className="text-sm">El chat es privado para los pilotos del equipo.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {modal === 'invitar' && (
        <Modal titulo="Invitar piloto" onClose={cerrar}>
          {equipo.miembros.length >= MAX_MIEMBROS ? (
            <p className="text-sm text-apex-muted">El equipo ya tiene el máximo de {MAX_MIEMBROS} pilotos.</p>
          ) : (
            <>
              <p className="text-sm text-apex-muted mb-3">Busca por nombre de usuario. Recibirá una notificación para aceptar o rechazar.</p>
              <BuscadorUsuarios
                autoFocus
                placeholder="Buscar piloto..."
                renderAccion={u => u.equipo ? (
                  <span className="text-xs text-apex-muted">Ya tiene equipo</span>
                ) : invitados.has(u.username) ? (
                  <span className="text-xs text-green-400">Invitado</span>
                ) : (
                  <button onClick={() => invitar(u.id, u.username)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-apex-red hover:bg-apex-red-dark text-white rounded-lg text-xs font-medium transition-colors">
                    <Send size={12} />Invitar
                  </button>
                )}
              />
              {invitados.size > 0 && (
                <p className="text-xs text-apex-muted mt-3">Invitaciones pendientes: {Array.from(invitados).join(', ')}</p>
              )}
            </>
          )}
        </Modal>
      )}

      {modal === 'gestionar' && (
        <GestionarModal equipo={equipo} currentUserId={currentUserId} onClose={cerrar} onSaved={() => { cerrar(); router.refresh() }} />
      )}

      {modal === 'propuesta' && (
        <PropuestaModal equipoId={equipo.id} onClose={cerrar} onSaved={() => { cerrar(); router.refresh() }} />
      )}

      {modal === 'salir' && (
        <Modal titulo="Salir del equipo" onClose={cerrar} ancho="max-w-md">
          <p className="text-sm text-apex-muted mb-5">
            {esLider && equipo.miembros.length > 1
              ? 'Eres el líder: antes de salir tienes que transferir el liderazgo a otro piloto desde "Gestionar equipo".'
              : esLider
                ? 'Eres el único piloto: si sales, el equipo se disolverá. Su histórico de puntos se conserva.'
                : `¿Seguro que quieres dejar ${equipo.nombre}? Los puntos que ya aportaste se quedan en el equipo.`}
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={cerrar} className="px-4 py-2 text-sm text-apex-muted hover:text-apex-text transition-colors">Cancelar</button>
            {!(esLider && equipo.miembros.length > 1) && (
              <button onClick={salir} disabled={busy}
                className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50">
                {esLider ? 'Disolver y salir' : 'Salir del equipo'}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function GestionarModal({ equipo, currentUserId, onClose, onSaved }: {
  equipo: Equipo
  currentUserId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    nombre: equipo.nombre,
    descripcion: equipo.descripcion ?? '',
    colorPrimario: equipo.colorPrimario ?? '#C0392B',
    logoUrl: equipo.logoUrl ?? '',
  })
  const [nuevoLider, setNuevoLider] = useState('')
  const [guardando, setGuardando] = useState(false)
  const otros = equipo.miembros.filter(m => m.userId !== currentUserId)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await fetch(`/api/equipos/${equipo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nuevoLiderId: nuevoLider || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al guardar'); return }
      toast.success(nuevoLider ? 'Cambios guardados y liderazgo transferido' : 'Cambios guardados')
      onSaved()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  async function expulsar(userId: string, username: string) {
    if (!confirm(`¿Expulsar a ${username} del equipo?`)) return
    const res = await fetch(`/api/equipos/${equipo.id}/miembros/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Error'); return }
    toast.success(`${username} ya no forma parte del equipo`)
    onSaved()
  }

  return (
    <Modal titulo="Gestionar equipo" onClose={onClose}>
      <form onSubmit={guardar} className="space-y-4">
        <div>
          <label htmlFor="g-nombre" className="block text-sm font-medium mb-1.5 text-apex-muted">Nombre</label>
          <input id="g-nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} minLength={3} maxLength={40} required className={INPUT} />
        </div>
        <div>
          <label htmlFor="g-desc" className="block text-sm font-medium mb-1.5 text-apex-muted">Descripción</label>
          <textarea id="g-desc" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} maxLength={500} rows={3} className={`${INPUT} resize-none`} />
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
          <div>
            <label htmlFor="g-color" className="block text-sm font-medium mb-1.5 text-apex-muted">Color</label>
            <input id="g-color" type="color" value={form.colorPrimario} onChange={e => setForm(f => ({ ...f, colorPrimario: e.target.value }))} className="w-14 h-10 rounded-lg bg-transparent cursor-pointer" />
          </div>
          <div>
            <label htmlFor="g-logo" className="block text-sm font-medium mb-1.5 text-apex-muted">URL del logo</label>
            <input id="g-logo" type="url" value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." className={INPUT} />
          </div>
        </div>

        {otros.length > 0 && (
          <div>
            <label htmlFor="g-lider" className="block text-sm font-medium mb-1.5 text-apex-muted">Transferir liderazgo</label>
            <select id="g-lider" value={nuevoLider} onChange={e => setNuevoLider(e.target.value)} className={INPUT}>
              <option value="">— Seguir siendo el líder —</option>
              {otros.map(m => <option key={m.userId} value={m.userId}>{m.user.username}</option>)}
            </select>
            {nuevoLider && <p className="text-xs text-yellow-400 mt-1">Dejarás de ser el líder al guardar.</p>}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={guardando}
            className="px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {otros.length > 0 && (
        <div className="mt-6 pt-5 border-t border-apex-border">
          <h3 className="text-sm font-semibold mb-2">Pilotos</h3>
          <div className="space-y-2">
            {otros.map(m => (
              <div key={m.userId} className="flex items-center gap-3">
                <Avatar username={m.user.username} avatar={m.user.avatar} size={28} />
                <span className="flex-1 text-sm">{m.user.username}</span>
                <button onClick={() => expulsar(m.userId, m.user.username)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
                  <UserMinus size={12} />Expulsar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function PropuestaModal({ equipoId, onClose, onSaved }: { equipoId: string; onClose: () => void; onSaved: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    try {
      const res = await fetch(`/api/equipos/${equipoId}/propuesta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, descripcion }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al enviar'); return }
      toast.success('Propuesta enviada a la organización')
      onSaved()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Propuesta del equipo" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <p className="text-sm text-apex-muted">Solo puedes enviar una propuesta por temporada. La organización la revisará y te responderá.</p>
        <div>
          <label htmlFor="p-titulo" className="block text-sm font-medium mb-1.5 text-apex-muted">Título</label>
          <input id="p-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} minLength={3} maxLength={100} required className={INPUT} placeholder="Ej: Coche de equipo para la próxima temporada" />
        </div>
        <div>
          <label htmlFor="p-desc" className="block text-sm font-medium mb-1.5 text-apex-muted">Descripción</label>
          <textarea id="p-desc" value={descripcion} onChange={e => setDescripcion(e.target.value)} minLength={10} maxLength={2000} rows={6} required className={`${INPUT} resize-none`} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={enviando}
            className="px-5 py-2.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {enviando ? 'Enviando...' : 'Enviar propuesta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
