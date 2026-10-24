'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Download, ShieldCheck, Trash2 } from 'lucide-react'

const INPUT = 'w-full bg-apex-surface border border-apex-border rounded-xl px-4 py-2.5 text-apex-text focus:border-apex-red/60 outline-none transition-colors text-sm'

// Derechos RGPD en el perfil propio: descargar los datos y eliminar la cuenta
export function PrivacidadDatos() {
  const [abierto, setAbierto] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [eliminando, setEliminando] = useState(false)

  async function eliminar(e: React.FormEvent) {
    e.preventDefault()
    setEliminando(true)
    try {
      const res = await fetch('/api/perfil/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmacion }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || 'No se pudo eliminar la cuenta'); return }
      toast.success('Tu cuenta se ha eliminado')
      await signOut({ callbackUrl: '/' })
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-6">
      <h3 className="font-bold flex items-center gap-2 mb-1"><ShieldCheck size={18} className="text-apex-red" />Privacidad y datos</h3>
      <p className="text-sm text-apex-muted mb-4">
        Consulta la <Link href="/privacidad" className="text-apex-red hover:underline">política de privacidad</Link>.
        Puedes descargar tus datos o eliminar tu cuenta cuando quieras.
      </p>

      <div className="flex flex-wrap gap-3">
        <a href="/api/perfil/datos"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-apex-border hover:border-apex-red/40 text-sm font-medium">
          <Download size={16} />Descargar mis datos (JSON)
        </a>
        <button onClick={() => setAbierto(a => !a)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm font-medium">
          <Trash2 size={16} />Eliminar mi cuenta
        </button>
      </div>

      {abierto && (
        <form onSubmit={eliminar} className="mt-5 space-y-3 border-t border-apex-border pt-5">
          <p className="text-sm text-red-300">
            Se cancelará tu suscripción (también en PayPal), saldrás de tu equipo y se borrarán tus datos personales.
            Tus resultados quedarán en las clasificaciones de forma anónima. Esta acción no se puede deshacer.
          </p>
          <div>
            <label className="block text-sm font-medium text-apex-muted mb-1.5">Contraseña actual</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className={INPUT} />
          </div>
          <div>
            <label className="block text-sm font-medium text-apex-muted mb-1.5">Escribe ELIMINAR para confirmar</label>
            <input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} className={INPUT} />
          </div>
          <button type="submit" disabled={eliminando || confirmacion !== 'ELIMINAR'}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-40">
            {eliminando ? 'Eliminando…' : 'Eliminar definitivamente'}
          </button>
        </form>
      )}
    </div>
  )
}
