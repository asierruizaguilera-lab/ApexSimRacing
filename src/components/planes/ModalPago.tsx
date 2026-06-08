'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import toast from 'react-hot-toast'
import { X, Check, Loader2 } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_FEATURES, cn } from '@/lib/utils'

type Paso = 'resumen' | 'pago' | 'exito'

interface Props {
  plan: string
  isLoggedIn?: boolean
  onClose: () => void
}

const PAYPAL_PLAN_IDS: Record<string, string> = {
  ROOKIE: process.env.NEXT_PUBLIC_PAYPAL_ROOKIE_PLAN_ID ?? '',
  AMATEUR: process.env.NEXT_PUBLIC_PAYPAL_AMATEUR_PLAN_ID ?? '',
  PRO: process.env.NEXT_PUBLIC_PAYPAL_PRO_PLAN_ID ?? '',
  ELITE: process.env.NEXT_PUBLIC_PAYPAL_ELITE_PLAN_ID ?? '',
}

export function ModalPago({ plan, isLoggedIn = true, onClose }: Props) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>('resumen')
  const [errorMsg, setErrorMsg] = useState('')

  const precio = PLAN_PRECIOS[plan]
  const label = PLAN_LABELS[plan]
  const features = PLAN_FEATURES[plan] || []

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''
  const planId = PAYPAL_PLAN_IDS[plan] ?? ''
  const paypalConfigurado = !!(paypalClientId && planId)

  async function onPayPalApprove(data: { subscriptionID?: string | null }) {
    try {
      const res = await fetch('/api/paypal/capture-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: data.subscriptionID, plan }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Error al confirmar')
      }
      setPaso('exito')
      toast.success(`¡Tu plan ${label} está activo! Ya puedes competir.`)
      setTimeout(() => {
        onClose()
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setErrorMsg(err.message)
      toast.error(err.message)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="relative w-full max-w-sm bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl text-center animate-fade-in">
          <button onClick={onClose} className="absolute top-4 right-4 text-apex-muted hover:text-apex-text">
            <X size={20} />
          </button>
          <div className="text-4xl mb-4">{plan === 'PRO' ? '🏆' : '🏁'}</div>
          <h2 className="text-xl font-bold mb-2">Plan {label} — {precio}€/mes</h2>
          <p className="text-apex-muted text-sm mb-6">Crea una cuenta gratis para suscribirte y empezar a competir.</p>
          <a href={`/register?plan=${plan}`}
            className="block w-full py-3 bg-apex-red text-white rounded-xl font-semibold hover:bg-apex-red-dark transition-colors">
            Crear cuenta
          </a>
          <a href="/login" className="block mt-3 text-sm text-apex-muted hover:text-apex-text transition-colors">
            Ya tengo cuenta
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      {/* PayPalScriptProvider wraps todo el modal para que el SDK cargue al abrirse,
          no al llegar al paso de pago — evita el error de SDK no inicializado */}
      <PayPalScriptProvider options={{
        clientId: paypalClientId || 'test',
        vault: true,
        intent: 'subscription',
        currency: 'EUR',
        components: 'buttons',
        dataSdkIntegrationSource: 'button-factory',
        environment: process.env.NEXT_PUBLIC_PAYPAL_MODE === 'sandbox' ? 'sandbox' : 'production',
      }}>
        <div className="w-full max-w-md bg-apex-card border border-apex-border rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-apex-border">
            <h2 className="font-bold text-lg">
              {paso === 'resumen' && `Plan ${label}`}
              {paso === 'pago' && 'Pagar con PayPal'}
              {paso === 'exito' && '¡Suscripción activa!'}
            </h2>
            <button onClick={onClose} className="text-apex-muted hover:text-apex-text transition-colors p-1">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {/* Paso 1: Resumen */}
            {paso === 'resumen' && (
              <div>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">{precio}€</span>
                  <span className="text-apex-muted mb-1">/mes</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check size={15} className="text-apex-red flex-shrink-0" />
                      <span className="text-apex-muted">{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-apex-muted mb-6">
                  Suscripción mensual recurrente. Puedes cancelar en cualquier momento desde tu panel.
                </p>
                <button
                  onClick={() => setPaso('pago')}
                  className="w-full py-3 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-semibold transition-colors">
                  Continuar al pago
                </button>
              </div>
            )}

            {/* Paso 2: PayPal */}
            {paso === 'pago' && (
              <div className="space-y-4">
                <div className="bg-apex-surface rounded-xl p-4 border border-apex-border text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-apex-muted">Plan</span>
                    <span className="font-medium">{label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-apex-muted">Total mensual</span>
                    <span className="font-bold text-apex-red">{precio}€</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                    {errorMsg}
                  </div>
                )}

                {paypalConfigurado ? (
                  <PayPalButtons
                    style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'subscribe' }}
                    createSubscription={(_data, actions) =>
                      actions.subscription.create({ plan_id: planId })
                    }
                    onApprove={onPayPalApprove}
                    onError={(err) => {
                      console.error('[PayPal]', err)
                      setErrorMsg('Error con PayPal. Inténtalo de nuevo.')
                    }}
                    onCancel={() => toast('Pago cancelado')}
                  />
                ) : (
                  <div className="text-center py-6 bg-apex-surface rounded-xl border border-apex-border">
                    <p className="text-apex-muted text-sm mb-2">PayPal no está configurado en este entorno.</p>
                    <p className="text-xs text-apex-muted">
                      Añade NEXT_PUBLIC_PAYPAL_CLIENT_ID y NEXT_PUBLIC_PAYPAL_{plan}_PLAN_ID al entorno.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setPaso('resumen')}
                  className="w-full text-sm text-apex-muted hover:text-apex-text transition-colors pt-1">
                  ← Volver
                </button>
              </div>
            )}

            {/* Paso 3: Éxito */}
            {paso === 'exito' && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">¡Tu plan {label} está activo!</h3>
                <p className="text-apex-muted text-sm mb-4">
                  Ya puedes competir. Los coches están disponibles en Mi Garaje.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-apex-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Redirigiendo al dashboard...
                </div>
              </div>
            )}
          </div>
        </div>
      </PayPalScriptProvider>
    </div>
  )
}
