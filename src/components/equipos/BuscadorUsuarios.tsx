'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar } from './EquipoLogo'

export interface UsuarioBusqueda {
  id: string
  username: string
  avatar: string | null
  pais: string | null
  equipo: { id: string; nombre: string } | null
}

/** Buscador de pilotos por username (debounce 250 ms) que delega la acción en `renderAccion`. */
export function BuscadorUsuarios({ placeholder, renderAccion, autoFocus }: {
  placeholder: string
  renderAccion: (u: UsuarioBusqueda) => React.ReactNode
  autoFocus?: boolean
}) {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<UsuarioBusqueda[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const termino = q.trim()
    if (termino.length < 2) { setResultados([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/usuarios/buscar?q=${encodeURIComponent(termino)}`, { signal: ctrl.signal })
        if (res.ok) setResultados(await res.json())
      } catch {} finally {
        setBuscando(false)
      }
    }, 250)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-apex-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
          aria-label={placeholder}
          className="w-full bg-apex-surface border border-apex-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-apex-red/60 outline-none transition-colors" />
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-2 border border-apex-border rounded-xl overflow-hidden divide-y divide-apex-border/50">
          {buscando && resultados.length === 0 && <div className="px-3 py-3 text-sm text-apex-muted">Buscando...</div>}
          {!buscando && resultados.length === 0 && <div className="px-3 py-3 text-sm text-apex-muted">Ningún piloto coincide</div>}
          {resultados.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-apex-surface/40">
              <Avatar username={u.username} avatar={u.avatar} size={30} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{u.username}</div>
                {u.equipo && <div className="text-xs text-apex-muted truncate">{u.equipo.nombre}</div>}
              </div>
              {renderAccion(u)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
