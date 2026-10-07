import Link from 'next/link'
import { Trophy, Crown } from 'lucide-react'
import { EquipoLogo, Avatar } from '@/components/equipos/EquipoLogo'

interface Props {
  mesNombre: string
  puntos: number
  equipo: {
    id: string
    nombre: string
    logoUrl: string | null
    colorPrimario: string | null
    miembros: { rol: string; user: { id: string; username: string; avatar: string | null } }[]
  }
}

export function EquipoDelMes({ equipo, puntos, mesNombre }: Props) {
  const color = equipo.colorPrimario || '#C0392B'
  return (
    <Link href={`/equipos/${equipo.id}`}
      className="block relative overflow-hidden rounded-xl border hover:scale-[1.005] transition-transform"
      style={{ borderColor: `${color}80`, background: `linear-gradient(120deg, ${color}33 0%, #2A2A2A 55%)` }}>
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <EquipoLogo nombre={equipo.nombre} logoUrl={equipo.logoUrl} color={color} size={64} className="rounded-2xl" />
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-yellow-400 font-semibold flex items-center gap-1">
            <Trophy size={13} />Equipo del mes · <span className="capitalize">{mesNombre}</span>
          </div>
          <h2 className="text-xl font-bold mt-0.5 truncate">🏆 Equipo del mes — {equipo.nombre}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {equipo.miembros.map(m => (
              <span key={m.user.id} className="flex items-center gap-1.5 text-xs bg-black/25 border border-white/10 rounded-full pl-0.5 pr-2 py-0.5">
                <Avatar username={m.user.username} avatar={m.user.avatar} size={20} />
                {m.user.username}
                {m.rol === 'LIDER' && <Crown size={11} style={{ color }} aria-label="Líder" />}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-3xl font-black" style={{ color }}>{puntos}</div>
          <div className="text-xs text-apex-muted">puntos</div>
        </div>
      </div>
    </Link>
  )
}
