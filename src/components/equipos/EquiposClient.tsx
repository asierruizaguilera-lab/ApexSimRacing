'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Shield, Plus, Users, Trophy, Check, X, Lock, Calendar, Car } from 'lucide-react'
import { cn, getPositionColor } from '@/lib/utils'
import { EquipoLogo } from './EquipoLogo'

interface EquipoRanking {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  colorPrimario: string | null
  miembros: number
  puntosMes: number
  posicion: number
}

interface Invitacion {
  id: string
  creadoEn: string
  equipo: { id: string; nombre: string; colorPrimario: string | null; logoUrl: string | null; miembros: number; lider: string }
}

interface Props {
  equipos: EquipoRanking[]
  mesNombre: string
  temporada: string | null
  miEquipoId: string | null
  puedeCrear: boolean
  esElite: boolean
  invitaciones: Invitacion[]
}

export function EquiposClient({ equipos, mesNombre, temporada, miEquipoId, puedeCrear, esElite, invitaciones: invIniciales }: Props) {
  const router = useRouter()
  const [invitaciones, setInvitaciones] = useState(invIniciales)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const top10 = equipos.filter(e => e.puntosMes > 0).slice(0, 10)

  async function responder(id: string, aceptar: boolean) {
    setRespondiendo(id)
    try {
      const res = await fetch(`/api/equipos/invitaciones/${id}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aceptar }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error'); return }
      if (aceptar) {
        toast.success('¡Bienvenido al equipo!')
        router.push(`/equipos/${data.equipoId}`)
        router.refresh()
      } else {
        setInvitaciones(prev => prev.filter(i => i.id !== id))
        toast.success('Invitación rechazada')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setRespondiendo(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-apex-red" size={24} />Equipos</h1>
          <p className="text-apex-muted mt-1">Liga por equipos de APEX — los puntos de los campeonatos de equipos suman cada mes</p>
          <div className="mt-2 inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border border-apex-border bg-apex-card text-apex-muted">
            <Calendar size={12} className="text-apex-red" />
            {temporada ?? 'Temporada aún no iniciada'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {miEquipoId && (
            <>
              <Link href="/equipos/garaje"
                className="flex items-center gap-2 px-4 py-2 bg-apex-card border border-apex-border hover:border-apex-red/40 rounded-xl text-sm font-medium transition-colors">
                <Car size={16} />Garaje de equipo
              </Link>
              <Link href={`/equipos/${miEquipoId}`}
                className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors">
                <Shield size={16} />Ver mi equipo
              </Link>
            </>
          )}
          {!miEquipoId && puedeCrear && (
            <Link href="/equipos/crear"
              className="flex items-center gap-2 px-4 py-2 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl text-sm font-semibold transition-colors">
              <Plus size={16} />Crear equipo
            </Link>
          )}
          {!miEquipoId && !puedeCrear && !esElite && (
            <Link href="/planes" title="Solo los pilotos Elite pueden crear equipos"
              className="flex items-center gap-2 px-4 py-2 bg-apex-card border border-apex-border text-apex-muted rounded-xl text-sm hover:border-apex-red/30 transition-colors">
              <Lock size={14} />Crear equipo (Elite)
            </Link>
          )}
        </div>
      </div>

      {/* Invitaciones pendientes */}
      {invitaciones.length > 0 && !miEquipoId && (
        <div className="bg-apex-card border border-apex-red/40 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-apex-border font-semibold text-sm">
            📩 Tienes {invitaciones.length} invitación{invitaciones.length === 1 ? '' : 'es'} de equipo
          </div>
          <div className="divide-y divide-apex-border/50">
            {invitaciones.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <EquipoLogo nombre={inv.equipo.nombre} logoUrl={inv.equipo.logoUrl} color={inv.equipo.colorPrimario} size={36} />
                <div className="flex-1 min-w-0">
                  <Link href={`/equipos/${inv.equipo.id}`} className="font-medium hover:text-apex-red transition-colors">{inv.equipo.nombre}</Link>
                  <div className="text-xs text-apex-muted">Líder: {inv.equipo.lider} · {inv.equipo.miembros} pilotos</div>
                </div>
                <button onClick={() => responder(inv.id, true)} disabled={respondiendo === inv.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50">
                  <Check size={13} />Aceptar
                </button>
                <button onClick={() => responder(inv.id, false)} disabled={respondiendo === inv.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-apex-surface text-apex-muted border border-apex-border rounded-lg text-xs hover:text-apex-text transition-colors disabled:opacity-50">
                  <X size={13} />Rechazar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Grid de equipos */}
        <div className="lg:col-span-2">
          {equipos.length === 0 ? (
            <div className="bg-apex-card border border-apex-border rounded-xl text-center py-16 text-apex-muted">
              <Shield size={48} className="mx-auto mb-4 opacity-30" />
              <p>Todavía no hay equipos.{puedeCrear ? ' ¡Crea el primero!' : ''}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {equipos.map(e => (
                <Link key={e.id} href={`/equipos/${e.id}`}
                  className={cn(
                    'bg-apex-card border rounded-xl overflow-hidden hover:border-apex-red/40 transition-all group',
                    e.id === miEquipoId ? 'border-apex-red/50' : 'border-apex-border'
                  )}>
                  <div className="h-1.5" style={{ background: e.colorPrimario || '#C0392B' }} />
                  <div className="p-4 flex items-start gap-3">
                    <EquipoLogo nombre={e.nombre} logoUrl={e.logoUrl} color={e.colorPrimario} size={48} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold truncate group-hover:text-apex-red transition-colors">{e.nombre}</h3>
                        {e.id === miEquipoId && <span className="text-[10px] bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full flex-shrink-0">Tu equipo</span>}
                      </div>
                      {e.descripcion && <p className="text-xs text-apex-muted line-clamp-2 mt-0.5">{e.descripcion}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-apex-muted">
                        <span className="flex items-center gap-1"><Users size={12} />{e.miembros}</span>
                        <span className="flex items-center gap-1"><Trophy size={12} className="text-yellow-400" />
                          <strong className="text-apex-text">{e.puntosMes}</strong> pts este mes
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ranking mensual */}
        <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-apex-border">
            <h2 className="font-semibold flex items-center gap-2"><Trophy size={16} className="text-yellow-400" />Top 10 del mes</h2>
            <p className="text-xs text-apex-muted capitalize">{mesNombre}</p>
          </div>
          {top10.length === 0 ? (
            <div className="px-4 py-8 text-center text-apex-muted text-sm">
              Aún ningún equipo ha puntuado este mes
            </div>
          ) : (
            <div className="divide-y divide-apex-border/50">
              {top10.map(e => (
                <Link key={e.id} href={`/equipos/${e.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-apex-surface/50 transition-colors">
                  <span className={cn('w-6 text-center text-sm font-bold', getPositionColor(e.posicion))}>{e.posicion}</span>
                  <EquipoLogo nombre={e.nombre} logoUrl={e.logoUrl} color={e.colorPrimario} size={28} className="rounded-lg" />
                  <span className="flex-1 text-sm font-medium truncate">{e.nombre}</span>
                  <span className="text-sm font-bold text-apex-red">{e.puntosMes}pts</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
