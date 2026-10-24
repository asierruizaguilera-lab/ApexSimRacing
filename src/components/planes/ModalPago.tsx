'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js'
import toast from 'react-hot-toast'
import { X, Check, Loader2, Trophy } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_PRECIOS_NORMAL, PLAN_FEATURES, DESCUENTO_TRANSICION_EQUIPO_PCT } from '@/lib/utils'

type Paso = 'resumen' | 'pago' | 'exito'

interface Props {
  plan: string
  isLoggedIn?: boolean
  onClose: () => void
}

export function ModalPago({ plan, isLoggedIn = true, onClose }: Props) {
  const router = useRouter()
  const [paso, setPaso] = useState<Paso>('resumen')
  const [errorMsg, setErrorMsg] = useState('')
  const [planId, setPlanId] = useState('')
  const [esFounder, setEsFounder] = useState(false)
  const [descuentoReferido, setDescuentoReferido] = useState(false)
  const [descuentoEquipo, setDescuentoEquipo] = useState(false)
  const [loadingPlanId, setLoadingPlanId] = useState(true)
  const [emailNoVerificado, setEmailNoVerificado] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) { setLoadingPlanId(false); return }
    fetch(`/api/paypal/check-founder?plan=${plan}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.planId) setPlanId(data.planId)
        setEmailNoVerificado(!!data?.emailNoVerificado)
        setEsFounder(!!data?.esFounderParaEstaCompra)
        setDescuentoReferido(!!data?.descuentoReferido)
        setDescuentoEquipo(!!data?.descuentoTransicionEquipo)
      })
      .catch(() => {})
      .finally(() => setLoadingPlanId(false))
  }, [plan, isLoggedIn])

  const precio = esFounder ? PLAN_PRECIOS[plan] : PLAN_PRECIOS_NORMAL[plan]
  // Primer mes con descuento: 20% si viene de un Equipo Founder o 10% por código de referido (no acumulables)
  const pctPrimerMes = descuentoEquipo ? DESCUENTO_TRANSICION_EQUIPO_PCT : descuentoReferido ? 10 : 0
  const hayDescuento = pctPrimerMes > 0
  const precioPrimerMes = Math.round(precio * (100 - pctPrimerMes)) / 100
  const label = PLAN_LABELS[plan]
  const features = PLAN_FEATURES[plan] || []

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? ''
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
                {esFounder && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-5">
                    <Trophy size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-400">
                      <strong>Estás a punto de convertirte en Founder APEX</strong> — precio bloqueado de por vida mientras mantengas la suscripción, y badge permanente.
                    </p>
                  </div>
                )}
                {descuentoEquipo ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5 text-sm text-green-400">
                    ✅ Vienes de un Equipo Founder — {DESCUENTO_TRANSICION_EQUIPO_PCT}% de descuento en tu primer mes
                    {descuentoReferido && ' (no acumulable con el código de referido)'}
                  </div>
                ) : descuentoReferido && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5 text-sm text-green-400">
                    ✅ Código de referido aplicado — 10% de descuento en tu primer mes
                  </div>
                )}
                <div className="flex items-end gap-1 mb-6">
                  {hayDescuento && (
                    <span className="text-xl text-apex-muted line-through mb-1 mr-1">{precio}€</span>
                  )}
                  <span className="text-4xl font-bold text-white">{precioPrimerMes}€</span>
                  <span className="text-apex-muted mb-1">{hayDescuento ? `el primer mes, luego ${precio}€/mes` : '/mes'}</span>
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
                    <span className="text-apex-muted">{hayDescuento ? 'Primer mes' : 'Total mensual'}</span>
                    <span className="font-bold text-apex-red">{precioPrimerMes}€</span>
                  </div>
                  {hayDescuento && (
                    <div className="flex justify-between mt-1">
                      <span className="text-apex-muted">A partir del 2º mes</span>
                      <span className="font-medium">{precio}€</span>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                    {errorMsg}
                  </div>
                )}

                {loadingPlanId ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-apex-muted text-sm">
                    <Loader2 size={16} className="animate-spin" />Preparando pago...
                  </div>
                ) : emailNoVerificado ? (
                  <div className="text-center py-6 bg-apex-surface rounded-xl border border-yellow-500/30">
                    <p className="text-yellow-400 text-sm mb-2">Confirma tu email antes de suscribirte.</p>
                    <p className="text-xs text-apex-muted">Te enviamos un enlace al registrarte. Puedes reenviarlo desde el aviso del panel o desde tu perfil.</p>
                  </div>
                ) : paypalConfigurado ? (
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
                      Añade NEXT_PUBLIC_PAYPAL_CLIENT_ID y el Plan ID de PayPal correspondiente al entorno.
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
