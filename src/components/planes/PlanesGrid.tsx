'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Star, Zap, AlertTriangle, Trophy } from 'lucide-react'
import toast from 'react-hot-toast'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_PRECIOS_NORMAL, PLAN_FEATURES, cn } from '@/lib/utils'
import { ModalPago } from './ModalPago'

interface Suscripcion {
  id: string
  plan: string
  estado: string
  fechaRenovacion: string
  esFounder?: boolean
}

interface Props {
  suscripcionActual: Suscripcion | null
  userId?: string
}

interface FounderInfo {
  esFounder: boolean
  plazasRestantes: number
  totalPlazas: number
  modoPrecio: 'FOUNDER' | 'NORMAL'
}

const PLANES = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

const PLAN_ICONS: Record<string, string> = {
  ROOKIE: '🏁',
  AMATEUR: '⚡',
  PRO: '🏆',
  ELITE: '👑',
}

const PLAN_COLORES_BG: Record<string, string> = {
  ROOKIE: 'border-blue-500/30',
  AMATEUR: 'border-purple-500/30',
  PRO: 'border-apex-red',
  ELITE: 'border-yellow-500/30',
}

export function PlanesGrid({ suscripcionActual, userId }: Props) {
  const router = useRouter()
  const [modalPlan, setModalPlan] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [founderInfo, setFounderInfo] = useState<FounderInfo | null>(null)

  useEffect(() => {
    fetch('/api/paypal/check-founder')
      .then(r => r.ok ? r.json() : null)
      .then(setFounderInfo)
      .catch(() => {})
  }, [])

  const esUsuarioFounder = founderInfo?.esFounder ?? false
  const quedanPlazas = (founderInfo?.plazasRestantes ?? 0) > 0
  const mostrarPreciosFounder = esUsuarioFounder || quedanPlazas

  async function cancelarSuscripcion() {
    setCancelling(true)
    try {
      const res = await fetch('/api/paypal/cancel-subscription', { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Error al cancelar')
        return
      }
      toast.success('Suscripción cancelada correctamente')
      setConfirmCancel(false)
      router.refresh()
    } catch {
      toast.error('Error de conexión')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      {/* Contador de plazas fundadoras */}
      {founderInfo && quedanPlazas && (
        <div className={cn(
          'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 mb-6 text-center font-semibold',
          founderInfo.plazasRestantes < 10
            ? 'bg-red-500/10 border-red-500/40 text-red-400'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
        )}>
          <Trophy size={18} />
          🏆 PLAZAS FUNDADORAS: {founderInfo.plazasRestantes} de {founderInfo.totalPlazas} disponibles
          {founderInfo.plazasRestantes < 10 && ' — ¡Últimas plazas!'}
        </div>
      )}

      {/* Banner plan actual */}
      {suscripcionActual && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <span className="text-green-400 font-semibold">
                ✓ Plan actual: {PLAN_LABELS[suscripcionActual.plan]}
              </span>
              <span className="text-apex-muted text-sm ml-3">
                Renueva el {new Date(suscripcionActual.fechaRenovacion).toLocaleDateString('es-ES')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {suscripcionActual.plan !== 'ELITE' && (
                <button
                  onClick={() => setModalPlan(PLANES[PLANES.indexOf(suscripcionActual.plan) + 1])}
                  className="text-xs px-3 py-1.5 bg-apex-red text-white rounded-lg hover:bg-apex-red-dark transition-colors flex items-center gap-1">
                  <Zap size={12} />Actualizar plan
                </button>
              )}
              {suscripcionActual.estado === 'ACTIVA' && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="text-xs px-3 py-1.5 bg-apex-surface border border-apex-border text-apex-muted rounded-lg hover:border-red-500/50 hover:text-red-400 transition-colors">
                  Cancelar suscripción
                </button>
              )}
            </div>
          </div>

          {/* Confirmación de cancelación */}
          {confirmCancel && (
            <div className="mt-4 pt-4 border-t border-green-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-apex-text font-medium mb-1">¿Cancelar suscripción?</p>
                  <p className="text-xs text-apex-muted mb-3">
                    Perderás acceso inmediatamente a los coches de tu plan y no podrás inscribirte en nuevos campeonatos.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={cancelarSuscripcion}
                      disabled={cancelling}
                      className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-60">
                      {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      disabled={cancelling}
                      className="text-xs px-3 py-1.5 bg-apex-surface text-apex-muted border border-apex-border rounded-lg hover:text-apex-text transition-colors disabled:opacity-60">
                      No, mantener
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid planes */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANES.map((plan) => {
          const precioFounder = PLAN_PRECIOS[plan]
          const precioNormal = PLAN_PRECIOS_NORMAL[plan]
          const precio = mostrarPreciosFounder ? precioFounder : precioNormal
          const label = PLAN_LABELS[plan]
          const features = PLAN_FEATURES[plan] || []
          const isPro = plan === 'PRO'
          const isActual = suscripcionActual?.plan === plan
          const isInferior = suscripcionActual
            ? PLANES.indexOf(plan) < PLANES.indexOf(suscripcionActual.plan)
            : false

          return (
            <div key={plan} className={cn(
              'relative bg-apex-card border rounded-2xl p-6 flex flex-col transition-all',
              isPro ? 'border-apex-red shadow-lg shadow-apex-red/10 scale-[1.02]' : PLAN_COLORES_BG[plan],
              isActual && 'ring-2 ring-green-500/50'
            )}>
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-apex-red text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star size={10} />Más popular
                </div>
              )}

              <div className="text-3xl mb-3">{PLAN_ICONS[plan]}</div>
              <h3 className="text-xl font-bold mb-1">{label}</h3>

              {isActual && suscripcionActual?.esFounder ? (
                <div className="mb-5">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{precioFounder}€</span>
                    <span className="text-apex-muted text-sm mb-0.5">/mes</span>
                    <span className="text-apex-muted text-sm line-through mb-0.5">{precioNormal}€</span>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                    <Trophy size={10} />Tu precio: {precioFounder}€ (Fundador)
                  </span>
                </div>
              ) : !isActual && !esUsuarioFounder && quedanPlazas ? (
                <div className="mb-5">
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{precioFounder}€</span>
                    <span className="text-apex-muted text-sm mb-0.5">/mes</span>
                    <span className="text-apex-muted text-sm line-through mb-0.5">{precioNormal}€</span>
                  </div>
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                    <Trophy size={10} />Precio Fundador
                  </span>
                </div>
              ) : (
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-3xl font-bold">{precio}€</span>
                  <span className="text-apex-muted text-sm mb-0.5">/mes</span>
                </div>
              )}

              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-apex-red flex-shrink-0 mt-0.5" />
                    <span className="text-apex-muted">{f}</span>
                  </li>
                ))}
              </ul>

              {isActual ? (
                <div className="py-2.5 text-center text-sm font-semibold text-green-400 bg-green-500/10 rounded-xl border border-green-500/20">
                  ✓ Tu plan actual
                </div>
              ) : isInferior ? (
                <div className="py-2.5 text-center text-sm text-apex-muted bg-apex-surface rounded-xl border border-apex-border">
                  Plan inferior
                </div>
              ) : !userId ? (
                <a href="/login"
                  className={cn('py-2.5 text-center text-sm font-semibold rounded-xl transition-colors block',
                    isPro ? 'bg-apex-red text-white hover:bg-apex-red-dark' : 'bg-apex-surface text-apex-text border border-apex-border hover:border-apex-red/50'
                  )}>
                  Iniciar sesión
                </a>
              ) : (
                <button
                  onClick={() => setModalPlan(plan)}
                  className={cn('py-2.5 text-sm font-semibold rounded-xl transition-colors',
                    isPro ? 'bg-apex-red text-white hover:bg-apex-red-dark' : 'bg-apex-surface text-apex-text border border-apex-border hover:border-apex-red/50'
                  )}>
                  {suscripcionActual ? 'Cambiar a este plan' : 'Suscribirme'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Nota */}
      <div className="mt-8 bg-apex-card border border-apex-border rounded-xl p-6 text-center">
        <p className="text-apex-muted text-sm">
          Todos los planes incluyen acceso completo a la comunidad, chat en tiempo real, ranking global y calendario de carreras.
          <br />Cancela cuando quieras — sin permanencia.
        </p>
      </div>

      {/* Modal */}
      {modalPlan && (
        <ModalPago
          plan={modalPlan}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  )
}
