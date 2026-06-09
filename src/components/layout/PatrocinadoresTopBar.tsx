'use client'

import { cn } from '@/lib/utils'

interface Patrocinador {
  id: string
  nombre: string
  logoUrl: string | null
  linkExterno: string | null
}

export function PatrocinadoresTopBar({ patrocinadores }: { patrocinadores: Patrocinador[] }) {
  if (patrocinadores.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-8 bg-[#111111] border-b border-white/5 flex items-center">
      <div className="flex items-center gap-3 px-4 w-full overflow-hidden">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 shrink-0 hidden sm:block">
          Patrocinadores:
        </span>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
          {patrocinadores.map(p => {
            const content = (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-1.5 shrink-0',
                  p.linkExterno && 'cursor-pointer opacity-70 hover:opacity-100 transition-opacity'
                )}
                title={p.nombre}
              >
                <div className="w-6 h-6 rounded overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                  {p.logoUrl ? (
                    <img
                      src={p.logoUrl}
                      alt={p.nombre}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[8px] font-bold text-white/40">
                      {p.nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/50 whitespace-nowrap hidden md:block">
                  {p.nombre}
                </span>
              </div>
            )

            return p.linkExterno ? (
              <a
                key={p.id}
                href={p.linkExterno}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content}
              </a>
            ) : (
              <div key={p.id}>{content}</div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
