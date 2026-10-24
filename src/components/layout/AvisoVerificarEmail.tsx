'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MailWarning } from 'lucide-react'

// Aviso fijo mientras el email no esté confirmado (sin confirmar no se puede pagar ni inscribirse)
export function AvisoVerificarEmail() {
  const [pendiente, setPendiente] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    fetch('/api/perfil/verificacion')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setPendiente(!!d?.pendiente))
      .catch(() => {})
  }, [])

  async function reenviar() {
    setEnviando(true)
    try {
      const res = await fetch('/api/perfil/verificacion', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.yaVerificado) { setPendiente(false); toast.success('Tu email ya está confirmado') }
        else toast.success('Te hemos enviado un nuevo enlace')
      } else toast.error(data.error || 'No se pudo enviar el email')
    } finally {
      setEnviando(false)
    }
  }

  if (!pendiente) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-sm">
      <MailWarning size={18} className="text-yellow-400 flex-shrink-0" />
      <span className="flex-1 min-w-[200px] text-yellow-100">
        Confirma tu email para poder suscribirte e inscribirte en campeonatos. Revisa tu bandeja de entrada.
      </span>
      <button onClick={reenviar} disabled={enviando}
        className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-medium disabled:opacity-50">
        {enviando ? 'Enviando…' : 'Reenviar enlace'}
      </button>
    </div>
  )
}
