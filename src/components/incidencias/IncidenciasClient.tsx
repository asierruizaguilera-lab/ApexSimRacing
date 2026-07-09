'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Flag, MessageSquareWarning, Paperclip } from 'lucide-react'
import {
  cn, formatFecha,
  TIPO_QUEJA_LABELS, ESTADO_QUEJA_LABELS, ESTADO_QUEJA_COLORS,
} from '@/lib/utils'

interface UsuarioMini { id: string; username: string; avatar: string | null }

interface Queja {
  id: string
  tipo: string
  estado: string
  titulo: string
  creadoEn: string
  denunciante: UsuarioMini
  denunciado: UsuarioMini | null
  carrera: { id: string; nombre: string; campeonato: { id: string; nombre: string } } | null
  _count: { pruebas: number }
}

const FILTROS = ['TODAS', 'ABIERTA', 'EN_REVISION', 'RESUELTA', 'ARCHIVADA']

export function IncidenciasClient({ quejas, userId }: { quejas: Queja[]; userId: string }) {
  const [filtro, setFiltro] = useState('TODAS')

  const filtradas = quejas.filter(q => filtro === 'TODAS' || q.estado === filtro)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-apex-card border border-apex-border rounded-xl p-1 overflow-x-auto">
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                filtro === f ? 'bg-apex-red text-white' : 'text-apex-muted hover:text-apex-text'
              )}>
              {f === 'TODAS' ? 'Todas' : ESTADO_QUEJA_LABELS[f]}
              {f !== 'TODAS' && (
                <span className="ml-1.5 text-[10px] bg-white/20 rounded-full px-1.5">
                  {quejas.filter(q => q.estado === f).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link href="/incidencias/nueva"
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-apex-red text-white rounded-xl text-sm font-medium hover:bg-apex-red-dark transition-colors">
          <Plus size={16} />Nueva Incidencia
        </Link>
      </div>

      {filtradas.length === 0 ? (
        <div className="bg-apex-card border border-apex-border rounded-xl py-16 text-center text-apex-muted">
          <MessageSquareWarning size={40} className="mx-auto mb-3 opacity-30" />
          <p>No tienes incidencias {filtro !== 'TODAS' ? `en estado "${ESTADO_QUEJA_LABELS[filtro]}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(q => {
            const esDenunciante = q.denunciante.id === userId
            const otraParte = esDenunciante ? q.denunciado : q.denunciante
            return (
              <Link key={q.id} href={`/incidencias/${q.id}`}
                className="block bg-apex-card border border-apex-border rounded-xl p-4 hover:border-apex-red/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-apex-surface border-apex-border text-apex-muted flex items-center gap-1">
                        {q.tipo === 'INCIDENCIA_CARRERA' ? <Flag size={10} /> : <MessageSquareWarning size={10} />}
                        {TIPO_QUEJA_LABELS[q.tipo]}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border', ESTADO_QUEJA_COLORS[q.estado])}>
                        {ESTADO_QUEJA_LABELS[q.estado]}
                      </span>
                    </div>
                    <h3 className="font-semibold truncate">{q.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-apex-muted mt-1">
                      <span>{esDenunciante ? 'Presentada por ti' : 'Recibida'}{otraParte && (esDenunciante ? ` contra ${otraParte.username}` : ` de ${otraParte.username}`)}</span>
                      {q.carrera && <span>· {q.carrera.campeonato.nombre} — {q.carrera.nombre}</span>}
                      <span>· {formatFecha(q.creadoEn)}</span>
                      {q._count.pruebas > 0 && (
                        <span className="flex items-center gap-1"><Paperclip size={11} />{q._count.pruebas}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
