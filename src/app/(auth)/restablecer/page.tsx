'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { KeyRound } from 'lucide-react'

const MIN = 10

export default function RestablecerPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)

  // Se lee de window.location para no necesitar un Suspense boundary con useSearchParams
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '')
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN) { toast.error(`La contraseña debe tener al menos ${MIN} caracteres`); return }
    if (password !== confirmar) { toast.error('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/restablecer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No se pudo cambiar la contraseña'); return }
      toast.success('Contraseña actualizada. Ya puedes iniciar sesión.')
      router.push('/login')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors'

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl animate-fade-in">
      <h2 className="text-xl font-bold mb-1">Nueva contraseña</h2>
      <p className="text-apex-muted text-sm mb-6">Al cambiarla se cerrarán las sesiones abiertas en otros dispositivos.</p>

      {!token ? (
        <p className="text-sm text-red-400">El enlace no es válido. <Link href="/recuperar" className="underline">Solicita uno nuevo</Link>.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={MIN}
              placeholder={`Mínimo ${MIN} caracteres`} autoComplete="new-password" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Repite la contraseña</label>
            <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required minLength={MIN}
              autoComplete="new-password" className={inputCls} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white transition-colors disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><KeyRound size={18} />Guardar contraseña</>}
          </button>
        </form>
      )}
    </div>
  )
}
