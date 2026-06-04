import { formatTimeAgo, DISCIPLINA_COLORS, DISCIPLINA_LABELS, getPositionColor, cn } from '@/lib/utils'

interface Result {
  id: string
  posicion: number
  puntos: number
  creadoEn: string
  user: { username: string; avatar: string | null }
  carrera: { nombre: string; campeonato: { nombre: string; disciplina: string } }
}

export function ActivityFeed({ results }: { results: Result[] }) {
  return (
    <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-apex-border">
        <h2 className="font-semibold">Actividad Reciente</h2>
      </div>
      <div className="divide-y divide-apex-border/50">
        {results.length === 0 ? (
          <div className="px-4 py-8 text-center text-apex-muted text-sm">
            No hay actividad reciente
          </div>
        ) : results.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-apex-surface/30 transition-colors">
            <div className="w-8 h-8 rounded-full bg-apex-red flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {r.user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium">{r.user.username}</span>
                <span className="text-apex-muted"> terminó </span>
                <span className={cn('font-bold', getPositionColor(r.posicion))}>{r.posicion}º</span>
                <span className="text-apex-muted"> en </span>
                <span className="font-medium">{r.carrera.nombre}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs px-1.5 py-0.5 rounded border', DISCIPLINA_COLORS[r.carrera.campeonato.disciplina])}>
                  {DISCIPLINA_LABELS[r.carrera.campeonato.disciplina]}
                </span>
                <span className="text-xs text-apex-muted">{formatTimeAgo(r.creadoEn)}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-apex-red">+{r.puntos}</div>
              <div className="text-xs text-apex-muted">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
