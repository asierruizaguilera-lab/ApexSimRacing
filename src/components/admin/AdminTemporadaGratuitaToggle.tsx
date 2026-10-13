'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Gift } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminTemporadaGratuitaToggle({ activa: activaInicial }: { activa: boolean }) {
  const router = useRouter()
  const [activa, setActiva] = useState(activaInicial)
  const [guardando, setGuardando] = useState(false)

  async function cambiar() {
    setGuardando(true)
    try {
      const res = await fetch('/api/admin/config/temporada-gratuita', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa: !activa }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Error al cambiar el modo')
        return
      }
      setActiva(data.temporadaGratuitaActiva)
      toast.success(data.temporadaGratuitaActiva ? 'Temporada gratuita activada' : 'Temporada gratuita desactivada')
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={cn(
      'bg-apex-card border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4',
      activa ? 'border-emerald-500/40' : 'border-apex-border'
    )}>
      <div className="flex items-start gap-3 flex-1">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', activa ? 'bg-emerald-500/15' : 'bg-apex-surface')}>
          <Gift size={20} className={activa ? 'text-emerald-400' : 'text-apex-muted'} />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">Modo Temporada Gratuita</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', activa
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-gray-500/20 text-gray-400 border-gray-500/30')}>
              {activa ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-sm text-apex-muted mt-1">
            Cuando está activo, todos los usuarios registrados tienen acceso completo sin suscripción de pago.
            El cambio se aplica a cada usuario en un máximo de 5 minutos.
          </p>
        </div>
      </div>
      <button
        onClick={cambiar}
        disabled={guardando}
        className={cn('px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex-shrink-0',
          activa
            ? 'bg-apex-surface border border-apex-border text-apex-text hover:border-red-500/50 hover:text-red-400'
            : 'bg-emerald-600 text-white hover:bg-emerald-500'
        )}>
        {guardando ? 'Guardando...' : activa ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}
