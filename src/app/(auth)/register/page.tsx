'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react'
import { PAISES_NOMBRES } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '', pais: 'ES' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [codigoRef, setCodigoRef] = useState('')
  const [estadoRef, setEstadoRef] = useState<'vacio' | 'validando' | 'valido' | 'invalido'>('vacio')

  // Prerellenar desde el link compartido (?ref=APEX-USER-1234). Se lee de window.location para no
  // necesitar un Suspense boundary con useSearchParams.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setCodigoRef(ref.toUpperCase())
  }, [])

  // Validación en tiempo real con debounce
  useEffect(() => {
    const codigo = codigoRef.trim()
    if (!codigo) { setEstadoRef('vacio'); return }
    setEstadoRef('validando')
    const controller = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/referidos/validar?codigo=${encodeURIComponent(codigo)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(d => setEstadoRef(d.valido ? 'valido' : 'invalido'))
        .catch(err => { if (err.name !== 'AbortError') setEstadoRef('invalido') })
    }, 400)
    return () => { clearTimeout(t); controller.abort() }
  }, [codigoRef])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (estadoRef === 'invalido' || estadoRef === 'validando') {
      toast.error(estadoRef === 'invalido' ? 'El código de referido no es válido — corrígelo o déjalo vacío' : 'Validando código de referido...')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, codigoReferido: codigoRef.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al registrarse')
        return
      }
      const result = await signIn('credentials', {
        email: form.email, password: form.password, redirect: false,
      })
      if (result?.ok) {
        toast.success('¡Bienvenido a APEX!')
        router.push('/dashboard')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl animate-fade-in">
      <h2 className="text-xl font-bold mb-1">Crear cuenta</h2>
      <p className="text-apex-muted text-sm mb-6">Únete a la comunidad APEX</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre de piloto</label>
          <input
            type="text"
            value={form.username}
            onChange={set('username')}
            placeholder="VelocidadMax"
            required
            minLength={3}
            maxLength={20}
            className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder="piloto@apex.gg"
            required
            className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">País</label>
          <select
            value={form.pais}
            onChange={set('pais')}
            className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors"
          >
            {Object.entries(PAISES_NOMBRES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors pr-10"
            />
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-apex-muted hover:text-apex-text">
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            ¿Tienes un código de referido? <span className="text-apex-muted font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={codigoRef}
              onChange={e => setCodigoRef(e.target.value.toUpperCase())}
              placeholder="APEX-PILOTO-1234"
              autoComplete="off"
              className={`w-full bg-apex-surface border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors pr-10 ${
                estadoRef === 'valido' ? 'border-green-500/60' : estadoRef === 'invalido' ? 'border-red-500/60' : 'border-apex-border focus:border-apex-red'
              }`}
            />
            {estadoRef === 'validando' && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-apex-muted animate-spin" />
            )}
          </div>
          {estadoRef === 'valido' && (
            <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
              ✅ Código válido — 10% de descuento en tu primer mes
            </span>
          )}
          {estadoRef === 'invalido' && (
            <span className="inline-block mt-2 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              ❌ Código no válido
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><UserPlus size={18} />Crear cuenta</>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-apex-muted mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-apex-red hover:underline font-medium">Iniciar sesión</Link>
      </p>
    </div>
  )
}
