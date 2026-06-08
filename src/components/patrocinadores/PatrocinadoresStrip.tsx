'use client'

import { cn } from '@/lib/utils'

export interface Patrocinador {
  id: string
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  linkExterno: string | null
}

function LogoFallback({ nombre, size = 'md' }: { nombre: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-16 h-16 text-base' }
  return (
    <div className={cn('rounded-lg bg-apex-card border border-apex-border flex items-center justify-center font-bold text-apex-muted', sizes[size])}>
      {initials}
    </div>
  )
}

function PatrocinadorItem({ p, size = 'md', showName = true }: { p: Patrocinador; size?: 'sm' | 'md' | 'lg'; showName?: boolean }) {
  const imgSizes = { sm: 'w-8 h-8', md: 'w-12 h-12', lg: 'w-16 h-16' }
  const content = (
    <div className={cn(
      'flex flex-col items-center gap-1.5 p-2 rounded-xl border border-apex-border/50 bg-apex-card/50 transition-all duration-200',
      p.linkExterno && 'cursor-pointer hover:border-apex-red/40 hover:brightness-110',
    )}>
      {p.logoUrl ? (
        <img
          src={p.logoUrl}
          alt={p.nombre}
          className={cn('object-contain rounded-lg', imgSizes[size])}
          title={p.nombre}
        />
      ) : (
        <LogoFallback nombre={p.nombre} size={size} />
      )}
      {showName && (
        <span className="text-xs text-apex-muted text-center leading-tight max-w-[80px] truncate">
          {p.nombre}
        </span>
      )}
    </div>
  )

  if (p.linkExterno) {
    return (
      <a href={p.linkExterno} target="_blank" rel="noopener noreferrer" title={p.nombre}>
        {content}
      </a>
    )
  }
  return content
}

// Sección completa para landing / campeonatos
export function PatrocinadoresSeccion({ patrocinadores, titulo = 'Nuestros Patrocinadores' }: {
  patrocinadores: Patrocinador[]
  titulo?: string
}) {
  if (patrocinadores.length === 0) return null
  return (
    <div className="flex flex-col items-center gap-6">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-apex-muted">{titulo}</h3>
      <div className="flex flex-wrap justify-center gap-4">
        {patrocinadores.map(p => (
          <PatrocinadorItem key={p.id} p={p} size="lg" showName />
        ))}
      </div>
    </div>
  )
}

// Banner horizontal para campeonatos
export function PatrocinadoresBanner({ patrocinadores }: { patrocinadores: Patrocinador[] }) {
  if (patrocinadores.length === 0) return null
  return (
    <div className="flex items-center gap-4 py-3 px-4 bg-apex-card/50 border border-apex-border rounded-xl">
      <span className="text-xs text-apex-muted whitespace-nowrap font-medium shrink-0">Patrocinado por</span>
      <div className="flex items-center gap-3 flex-wrap">
        {patrocinadores.map(p => (
          <PatrocinadorItem key={p.id} p={p} size="sm" showName={false} />
        ))}
      </div>
    </div>
  )
}

// Strip compacto para sidebar (máx 4)
export function PatrocinadoresSidebar({ patrocinadores }: { patrocinadores: Patrocinador[] }) {
  if (patrocinadores.length === 0) return null
  const visible = patrocinadores.slice(0, 4)
  return (
    <div className="px-3 py-3 border-t border-apex-border">
      <p className="text-xs text-apex-muted/60 uppercase tracking-wider mb-2 px-1 font-semibold">Patrocinadores</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {visible.map(p => {
          const content = (
            <div
              key={p.id}
              className="w-8 h-8 rounded-lg overflow-hidden border border-apex-border/50 bg-apex-card flex items-center justify-center hover:border-apex-red/40 transition-colors"
              title={p.nombre}
            >
              {p.logoUrl ? (
                <img src={p.logoUrl} alt={p.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-apex-muted">
                  {p.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          )
          return p.linkExterno ? (
            <a key={p.id} href={p.linkExterno} target="_blank" rel="noopener noreferrer">{content}</a>
          ) : <div key={p.id}>{content}</div>
        })}
      </div>
    </div>
  )
}
