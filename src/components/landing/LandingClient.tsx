'use client'

import Link from 'next/link'
import { Check, Star } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRECIOS, PLAN_FEATURES, DISCIPLINA_COLORS, DISCIPLINA_LABELS, cn } from '@/lib/utils'

const PLAN_ICONS: Record<string, string> = {
  ROOKIE: '🏁', AMATEUR: '⚡', PRO: '🏆', ELITE: '👑',
}

const DISCIPLINA_ICONS: Record<string, string> = {
  RALLY: '🏔️',
  CIRCUITO: '🏟️',
  DRIFT: '💨',
  KARTCROSS: '🎯',
  MONOPLAZA: '🚀',
}

const DISCIPLINA_DESCS: Record<string, string> = {
  RALLY: 'Etapas de tierra y asfalto, tramos cronometrados en todo terreno.',
  CIRCUITO: 'Pistas de asfalto, trazadas perfectas y batallas rueda a rueda.',
  DRIFT: 'Ángulo, estilo y control: la disciplina más espectacular.',
  KARTCROSS: 'Competición en tierra con karts de alto rendimiento.',
  MONOPLAZA: 'Monoplazas de Fórmula: la cúspide del motorsport virtual.',
}

const PLANES = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

export function LandingClient() {
  return (
    <div className="min-h-screen bg-apex-bg font-sans">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-apex-bg/90 backdrop-blur-md border-b border-apex-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <img src="/logo-apex-medio.jpg" alt="APEX" className="h-9 w-auto object-contain rounded" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-apex-muted hover:text-apex-text transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/registro"
              className="px-4 py-2 bg-apex-red text-white text-sm rounded-lg hover:bg-apex-red-dark transition-colors font-semibold">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14 overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundColor: '#111111',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-apex-bg pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <img
            src="/logo-apex-medio.jpg"
            alt="APEX"
            className="h-28 w-auto object-contain mx-auto mb-10 drop-shadow-2xl"
          />
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-5 leading-tight">
            <span className="text-white">Del Simulador</span>
            <br />
            <span className="text-apex-red">al Tramo Real</span>
          </h1>
          <p className="text-lg sm:text-xl text-apex-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            La comunidad hispanohablante que convierte pilotos virtuales en pilotos reales
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/registro"
              className="px-8 py-4 bg-apex-red hover:bg-apex-red-dark text-white rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-xl shadow-apex-red/40">
              Empieza ahora
            </Link>
            <a
              href="#planes"
              className="px-8 py-4 bg-transparent border-2 border-white/60 hover:border-white text-white rounded-xl font-bold text-lg transition-all hover:scale-105">
              Ver planes
            </a>
          </div>
        </div>
      </section>

      {/* ── EL PROBLEMA ── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#1C1C1C' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Lo que APEX resuelve</h2>
          <p className="text-apex-muted text-center mb-14 max-w-xl mx-auto">
            El motor hispanohablante necesitaba una casa. Esta es la nuestra.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 text-center">
            {[
              { icon: '🏎️', text: 'El motor real cuesta 30.000€ al año. APEX no.' },
              { icon: '🌍', text: 'La comunidad hispanohablante del motor está fragmentada. APEX la une.' },
              { icon: '🎯', text: 'No sabes por dónde empezar. APEX te da el camino.' },
            ].map((item) => (
              <div key={item.text}
                className="bg-apex-card border border-apex-border rounded-2xl p-8 hover:border-apex-red/30 transition-colors">
                <div className="text-6xl mb-5">{item.icon}</div>
                <p className="text-apex-text font-medium leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="py-24 px-6 bg-apex-bg">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Cómo funciona APEX</h2>
          <p className="text-apex-muted text-center mb-14 max-w-xl mx-auto">
            Cuatro pasos para pasar del pad al volante.
          </p>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'Regístrate', desc: 'Crea tu perfil de piloto en segundos.' },
              { n: '02', title: 'Elige tu plan', desc: 'Desde 5€/mes, accede a coches y campeonatos.' },
              { n: '03', title: 'Compite', desc: 'Inscríbete en campeonatos de rally, circuito, drift y más.' },
              { n: '04', title: 'Crece', desc: 'Sube en el ranking global, gana trofeos, llega al motor real.' },
            ].map((step) => (
              <div key={step.n}
                className="bg-apex-card border border-apex-border rounded-2xl p-6 text-center hover:border-apex-red/30 transition-colors">
                <div className="text-5xl font-extrabold text-apex-red mb-3 leading-none">{step.n}</div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-apex-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LAS DISCIPLINAS ── */}
      <section className="py-24 px-6 bg-apex-surface border-t border-apex-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Las disciplinas</h2>
          <p className="text-apex-muted text-center mb-14 max-w-xl mx-auto">
            Cinco categorías, un solo objetivo: competir al máximo nivel.
          </p>
          <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.keys(DISCIPLINA_LABELS).map((d) => (
              <div key={d}
                className="bg-apex-card border border-apex-border rounded-2xl p-6 text-center hover:border-apex-red/20 transition-all hover:-translate-y-0.5">
                <div className="text-5xl mb-4">{DISCIPLINA_ICONS[d]}</div>
                <span className={cn('inline-block text-xs px-2 py-1 rounded-full border mb-3', DISCIPLINA_COLORS[d])}>
                  {DISCIPLINA_LABELS[d]}
                </span>
                <p className="text-apex-muted text-xs leading-relaxed">{DISCIPLINA_DESCS[d]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LOS PLANES ── */}
      <section id="planes" className="py-24 px-6 bg-apex-bg">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Los planes</h2>
          <p className="text-apex-muted text-center mb-14 max-w-xl mx-auto">
            Sin permanencia. Sin letra pequeña. Cancela cuando quieras.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {PLANES.map((plan) => {
              const isPro = plan === 'PRO'
              return (
                <div key={plan} className={cn(
                  'relative bg-apex-card border rounded-2xl p-6 flex flex-col transition-all',
                  isPro
                    ? 'border-apex-red shadow-lg shadow-apex-red/20 scale-[1.03]'
                    : 'border-apex-border hover:border-apex-red/30'
                )}>
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-apex-red text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                      <Star size={10} /> Más popular
                    </div>
                  )}
                  <div className="text-3xl mb-3">{PLAN_ICONS[plan]}</div>
                  <h3 className="text-xl font-bold mb-1">{PLAN_LABELS[plan]}</h3>
                  <div className="flex items-end gap-1 mb-5">
                    <span className="text-3xl font-bold">{PLAN_PRECIOS[plan]}€</span>
                    <span className="text-apex-muted text-sm mb-0.5">/mes</span>
                  </div>
                  <ul className="space-y-2 flex-1 mb-6">
                    {(PLAN_FEATURES[plan] || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check size={14} className="text-apex-red flex-shrink-0 mt-0.5" />
                        <span className="text-apex-muted">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/registro?plan=${plan}`}
                    className={cn(
                      'block text-center py-3 text-sm font-semibold rounded-xl transition-colors',
                      isPro
                        ? 'bg-apex-red text-white hover:bg-apex-red-dark'
                        : 'bg-apex-surface text-apex-text border border-apex-border hover:border-apex-red/50'
                    )}>
                    Empezar
                  </Link>
                </div>
              )
            })}
          </div>
          <div className="text-center">
            <Link href="/planes"
              className="inline-block px-6 py-3 border border-apex-border text-apex-muted hover:text-apex-text hover:border-apex-red/40 rounded-xl text-sm font-medium transition-colors">
              Ver todos los planes y comparativa completa →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 bg-apex-red text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            ¿Listo para competir?
          </h2>
          <p className="text-white/80 text-lg mb-10 leading-relaxed">
            Únete a la comunidad del motor hispanohablante.<br />
            Tu primer campeonato te espera.
          </p>
          <Link
            href="/registro"
            className="inline-block px-10 py-4 bg-white text-apex-red rounded-xl font-extrabold text-lg hover:bg-white/90 transition-all hover:scale-105 shadow-xl shadow-black/20">
            Crear mi cuenta
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-apex-bg border-t border-apex-border py-10 px-6 text-center">
        <img src="/logo-apex-medio.jpg" alt="APEX" className="h-8 w-auto object-contain mx-auto mb-3 opacity-70" />
        <p className="text-apex-muted text-sm font-medium">Del Simulador al Tramo Real</p>
        <p className="text-apex-muted/60 text-xs mt-2">© 2025 APEX SimRacing</p>
      </footer>
    </div>
  )
}
