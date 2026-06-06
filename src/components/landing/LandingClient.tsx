'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Star, Zap, Shield, Trophy, Users } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_FEATURES, cn } from '@/lib/utils'
import { ModalPago } from '@/components/planes/ModalPago'

const PLANES = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

const PLAN_ICONS: Record<string, string> = {
  ROOKIE: '🏁', AMATEUR: '⚡', PRO: '🏆', ELITE: '👑',
}

const PLAN_BORDE: Record<string, string> = {
  ROOKIE: 'border-blue-500/20',
  AMATEUR: 'border-purple-500/20',
  PRO: 'border-apex-red shadow-lg shadow-apex-red/15',
  ELITE: 'border-yellow-500/20',
}

interface Props {
  isLoggedIn: boolean
  userId?: string
}

export function LandingClient({ isLoggedIn, userId }: Props) {
  const [modalPlan, setModalPlan] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-apex-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-apex-bg/80 backdrop-blur-md border-b border-apex-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-apex-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold tracking-widest">APEX</span>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <button onClick={() => setModalPlan('PRO')}
                className="px-4 py-2 bg-apex-red text-white text-sm rounded-lg hover:bg-apex-red-dark transition-colors font-medium">
                Activar Plan
              </button>
            ) : (
              <>
                <Link href="/login" className="text-sm text-apex-muted hover:text-apex-text transition-colors">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="px-4 py-2 bg-apex-red text-white text-sm rounded-lg hover:bg-apex-red-dark transition-colors font-medium">
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-14">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-apex-red/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-24 text-center relative">
            <div className="inline-flex items-center gap-2 bg-apex-card border border-apex-border rounded-full px-4 py-1.5 text-sm text-apex-muted mb-6">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Plataforma online — únete ahora
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-4">
              <span className="text-white">APEX</span>
              <br />
              <span className="text-apex-red">SimRacing</span>
            </h1>
            <p className="text-xl text-apex-muted max-w-2xl mx-auto mb-8">
              Del Simulador al Tramo Real. La comunidad hispanohablante de SimRacing
              donde los pilotos compiten, se clasifican y mejoran juntos.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button onClick={() => setModalPlan('PRO')}
                className="px-8 py-3.5 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-apex-red/30">
                Empezar a Competir
              </button>
              <a href="#planes" className="px-8 py-3.5 bg-apex-card border border-apex-border text-white rounded-xl font-semibold text-lg hover:border-apex-red/50 transition-colors">
                Ver Planes
              </a>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { icon: Users, value: '15+', label: 'Pilotos activos' },
              { icon: Trophy, value: '3', label: 'Campeonatos' },
              { icon: Zap, value: '100%', label: 'Online' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-apex-card border border-apex-border rounded-xl p-6">
                <Icon size={24} className="text-apex-red mx-auto mb-2" />
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-apex-muted text-sm">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Planes */}
      <div id="planes" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Elige tu Plan</h2>
          <p className="text-apex-muted">Suscripción mensual. Sin permanencia. Cancela cuando quieras.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANES.map((plan) => {
            const precio = PLAN_PRECIOS[plan]
            const label = PLAN_LABELS[plan]
            const features = PLAN_FEATURES[plan] || []
            const isPro = plan === 'PRO'

            return (
              <div key={plan} className={cn(
                'relative bg-apex-card border rounded-2xl p-6 flex flex-col',
                PLAN_BORDE[plan],
                isPro && 'scale-[1.03]'
              )}>
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-apex-red text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
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
                {isLoggedIn ? (
                  <button onClick={() => setModalPlan(plan)}
                    className={cn('py-3 text-sm font-semibold rounded-xl transition-colors',
                      isPro ? 'bg-apex-red text-white hover:bg-apex-red-dark' : 'bg-apex-surface text-apex-text border border-apex-border hover:border-apex-red/50'
                    )}>
                    Suscribirme
                  </button>
                ) : (
                  <Link href={`/register?plan=${plan}`}
                    className={cn('block text-center py-3 text-sm font-semibold rounded-xl transition-colors',
                      isPro ? 'bg-apex-red text-white hover:bg-apex-red-dark' : 'bg-apex-surface text-apex-text border border-apex-border hover:border-apex-red/50'
                    )}>
                    Empezar
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-apex-muted text-sm mt-8">
          Todos los planes incluyen acceso completo a chat, ranking, calendario y comunidad. · Pago seguro con PayPal.
        </p>
      </div>

      {/* Features */}
      <div className="bg-apex-surface border-t border-apex-border py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: '🏎️', title: 'Campeonatos Reales', desc: 'Compite en campeonatos organizados con sistema de puntos estilo F1.' },
            { icon: '💬', title: 'Comunidad Activa', desc: 'Chat en tiempo real por canales: general, rally, circuito, drift.' },
            { icon: '🏆', title: 'Ranking Global', desc: 'Sube posiciones, consigue trofeos y hazte un nombre en la comunidad.' },
          ].map(f => (
            <div key={f.title}>
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-apex-muted text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-apex-bg border-t border-apex-border py-8 text-center">
        <div className="text-apex-muted text-sm">
          © 2025 APEX SimRacing · La comunidad hispanohablante de SimRacing
          <br />
          <a href="mailto:soporte@apex.gg" className="hover:text-apex-text transition-colors">soporte@apex.gg</a>
        </div>
      </footer>

      {modalPlan && (
        <ModalPago
          plan={modalPlan}
          isLoggedIn={isLoggedIn}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  )
}
