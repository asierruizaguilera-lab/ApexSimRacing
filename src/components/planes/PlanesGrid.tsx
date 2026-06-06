'use client'

import { useState } from 'react'
import { Check, Star, Zap } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_FEATURES, cn } from '@/lib/utils'
import { ModalPago } from './ModalPago'

interface Suscripcion {
  id: string
  plan: string
  estado: string
  fechaRenovacion: string
}

interface Props {
  suscripcionActual: Suscripcion | null
  userId?: string
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
  const [modalPlan, setModalPlan] = useState<string | null>(null)

  return (
    <div>
      {/* Banner plan actual */}
      {suscripcionActual && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-8 flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="text-green-400 font-semibold">
              ✓ Plan actual: {PLAN_LABELS[suscripcionActual.plan]}
            </span>
            <span className="text-apex-muted text-sm ml-3">
              Renueva el {new Date(suscripcionActual.fechaRenovacion).toLocaleDateString('es-ES')}
            </span>
          </div>
          {suscripcionActual.plan !== 'ELITE' && (
            <button
              onClick={() => setModalPlan(PLANES[PLANES.indexOf(suscripcionActual.plan) + 1])}
              className="text-xs px-3 py-1.5 bg-apex-red text-white rounded-lg hover:bg-apex-red-dark transition-colors flex items-center gap-1"
            >
              <Zap size={12} />Actualizar plan
            </button>
          )}
        </div>
      )}

      {/* Grid planes */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANES.map((plan) => {
          const precio = PLAN_PRECIOS[plan]
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

              <div className="flex items-end gap-1 mb-5">
                <span className="text-3xl font-bold">{precio}€</span>
                <span className="text-apex-muted text-sm mb-0.5">/mes</span>
              </div>

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

      {/* Comparativa feature */}
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
