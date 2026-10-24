'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [estado, setEstado] = useState<'form' | 'enviado' | 'sinEmail'>('form')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'No se pudo procesar la solicitud'); return }
      setEstado(data.envioDisponible ? 'enviado' : 'sinEmail')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl animate-fade-in">
      <h2 className="text-xl font-bold mb-1">Recuperar contraseña</h2>

      {estado === 'form' && (
        <>
          <p className="text-apex-muted text-sm mb-6">Te enviaremos un enlace para elegir una nueva contraseña.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="piloto@apex.gg"
                className="w-full bg-apex-surface border border-apex-border rounded-lg px-3 py-2.5 text-sm focus:border-apex-red focus:outline-none transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white transition-colors disabled:opacity-50">
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Mail size={18} />Enviar enlace</>}
            </button>
          </form>
        </>
      )}

      {estado === 'enviado' && (
        <p className="text-apex-muted text-sm mt-4 leading-relaxed">
          Si existe una cuenta con ese email, recibirás un enlace en unos minutos. Caduca en 1 hora.
          Revisa también la carpeta de spam.
        </p>
      )}

      {estado === 'sinEmail' && (
        <p className="text-apex-muted text-sm mt-4 leading-relaxed">
          El envío de emails no está disponible ahora mismo. Escríbenos desde el chat de la comunidad o a soporte y
          te ayudaremos a recuperar el acceso.
        </p>
      )}

      <p className="text-center text-sm text-apex-muted mt-6">
        <Link href="/login" className="text-apex-red hover:underline font-medium">Volver a iniciar sesión</Link>
      </p>
    </div>
  )
}
