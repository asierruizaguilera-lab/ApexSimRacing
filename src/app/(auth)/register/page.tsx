'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { PAISES_NOMBRES } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '', pais: 'ES' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
