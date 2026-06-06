'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await signIn('credentials', {
      email, password, redirect: false,
    })
    setLoading(false)
    if (result?.ok) {
      toast.success('¡Bienvenido de vuelta!')
      router.push('/dashboard')
      router.refresh()
    } else {
      toast.error('Email o contraseña incorrectos')
    }
  }

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl animate-fade-in">
      <h2 className="text-xl font-bold mb-1">Iniciar sesión</h2>
      <p className="text-apex-muted text-sm mb-6">Accede a tu cuenta de APEX</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="piloto@apex.gg"
            required
            className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Contraseña</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-apex-muted hover:text-apex-text"
            >
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
            <>
              <LogIn size={18} />
              Iniciar sesión
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-apex-muted mt-6">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-apex-red hover:underline font-medium">
          Regístrate gratis
        </Link>
      </p>
    </div>
  )
}
