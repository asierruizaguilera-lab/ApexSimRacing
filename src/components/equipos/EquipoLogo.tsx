import { cn } from '@/lib/utils'

const COLOR_DEFECTO = '#C0392B'

/** Logo del equipo o, si no tiene, un escudo con sus iniciales sobre su color. */
export function EquipoLogo({ nombre, logoUrl, color, size = 40, className }: {
  nombre: string
  logoUrl?: string | null
  color?: string | null
  size?: number
  className?: string
}) {
  const iniciales = nombre.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div
      className={cn('rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 font-bold text-white border border-white/10', className)}
      style={{ width: size, height: size, background: color || COLOR_DEFECTO, fontSize: Math.max(10, size * 0.36) }}
    >
      {logoUrl ? <img src={logoUrl} alt={nombre} className="w-full h-full object-cover" /> : iniciales}
    </div>
  )
}

export function Avatar({ username, avatar, size = 32, className }: {
  username: string
  avatar?: string | null
  size?: number
  className?: string
}) {
  return avatar ? (
    <img src={avatar} alt={username} className={cn('rounded-full object-cover flex-shrink-0', className)} style={{ width: size, height: size }} />
  ) : (
    <div
      className={cn('rounded-full bg-apex-red flex items-center justify-center text-white font-bold flex-shrink-0', className)}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.34) }}
    >
      {username.slice(0, 2).toUpperCase()}
    </div>
  )
}
