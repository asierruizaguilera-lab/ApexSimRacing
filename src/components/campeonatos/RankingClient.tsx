'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getPaisFlag, getPaisNombre, getPositionColor, getPositionBg, PAISES_NOMBRES, cn } from '@/lib/utils'
import { Trophy, Medal } from 'lucide-react'

interface Piloto {
  id: string; username: string; avatar: string | null; pais: string | null
  totalPuntos: number; totalCarreras: number; totalVictorias: number; totalPodios: number
}

const PAGE_SIZE = 25

export function RankingClient({ pilotos, currentUserId }: { pilotos: Piloto[]; currentUserId?: string }) {
  const [filtroPais, setFiltroPais] = useState('TODOS')
  const [page, setPage] = useState(0)

  const filtrados = pilotos.filter(p => filtroPais === 'TODOS' || p.pais === filtroPais)
  const paginados = filtrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtrados.length / PAGE_SIZE)

  const paises = ['TODOS', ...Array.from(new Set(pilotos.map(p => p.pais).filter(Boolean) as string[]))]

  return (
    <div>
      {/* Top 3 Podio */}
      {pilotos.filter(p => p.totalPuntos > 0).length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[pilotos[1], pilotos[0], pilotos[2]].map((p, displayIdx) => {
            if (!p) return null
            const rank = displayIdx === 1 ? 1 : displayIdx === 0 ? 2 : 3
            const isFirst = rank === 1
            return (
              <Link key={p.id} href={`/perfil/${p.id}`}
                className={cn(
                  'flex flex-col items-center bg-apex-card border rounded-xl p-4 hover:border-apex-red/30 transition-all text-center',
                  isFirst ? 'border-yellow-400/30 shadow-lg shadow-yellow-400/10' : 'border-apex-border',
                  isFirst ? 'order-2 -mt-0' : displayIdx === 0 ? 'order-1 mt-4' : 'order-3 mt-6'
                )}>
                <div className={cn('text-3xl mb-2', isFirst ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600')}>
                  {isFirst ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                </div>
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2',
                  isFirst ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-500' : 'bg-amber-700')}>
                  {p.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="font-bold text-sm truncate w-full">{p.username}</div>
                <div className="text-sm mt-0.5">{getPaisFlag(p.pais)}</div>
                <div className={cn('text-lg font-bold mt-1', isFirst ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : 'text-amber-600')}>
                  {p.totalPuntos} pts
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Filtros país */}
      <div className="flex flex-wrap gap-2 mb-4">
        {paises.map(p => (
          <button key={p} onClick={() => { setFiltroPais(p); setPage(0) }}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
              filtroPais === p
                ? 'bg-apex-red text-white border-apex-red'
                : 'bg-apex-card text-apex-muted border-apex-border hover:text-apex-text'
            )}>
            {p === 'TODOS' ? 'Todos los países' : `${getPaisFlag(p)} ${getPaisNombre(p)}`}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
        <table className="w-full table-apex">
          <thead>
            <tr className="border-b border-apex-border text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted w-12">#</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted">Piloto</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden sm:table-cell">Carreras</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden sm:table-cell">Victorias</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-center hidden md:table-cell">Podios</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-apex-muted text-right">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apex-border/50">
            {paginados.map((p, i) => {
              const globalRank = filtrados.indexOf(p) + 1
              const isCurrentUser = p.id === currentUserId
              return (
                <tr key={p.id} className={cn(
                  'transition-colors',
                  isCurrentUser && 'bg-apex-red/5 border-l-2 border-l-apex-red',
                  getPositionBg(globalRank)
                )}>
                  <td className="px-4 py-3">
                    <span className={cn('font-bold text-sm', getPositionColor(globalRank))}>
                      {globalRank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/perfil/${p.id}`} className="flex items-center gap-2 hover:text-apex-red transition-colors">
                      <div className="w-8 h-8 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {p.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {p.username}
                          {isCurrentUser && <span className="text-xs bg-apex-red/20 text-apex-red px-1.5 py-0.5 rounded-full">Tú</span>}
                        </div>
                        <div className="text-xs text-apex-muted">{getPaisFlag(p.pais)} {getPaisNombre(p.pais)}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center text-sm hidden sm:table-cell">{p.totalCarreras}</td>
                  <td className="px-4 py-3 text-center text-sm hidden sm:table-cell">{p.totalVictorias}</td>
                  <td className="px-4 py-3 text-center text-sm hidden md:table-cell">{p.totalPodios}</td>
                  <td className="px-4 py-3 text-right font-bold text-apex-red">{p.totalPuntos}</td>
                </tr>
              )
            })}
            {paginados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-apex-muted">
                  No hay pilotos en este filtro
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-apex-border">
            <span className="text-sm text-apex-muted">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtrados.length)} de {filtrados.length}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1.5 text-sm bg-apex-surface border border-apex-border rounded-lg disabled:opacity-40 hover:border-apex-red/50 transition-colors">
                Anterior
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                className="px-3 py-1.5 text-sm bg-apex-surface border border-apex-border rounded-lg disabled:opacity-40 hover:border-apex-red/50 transition-colors">
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
