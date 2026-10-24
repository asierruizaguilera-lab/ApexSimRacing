'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function VerificarEmailPage() {
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'error'>('verificando')
  const [mensaje, setMensaje] = useState('')
  const enviado = useRef(false)

  useEffect(() => {
    if (enviado.current) return
    enviado.current = true
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    fetch('/api/auth/verificar-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}))
        if (res.ok) setEstado('ok')
        else { setEstado('error'); setMensaje(data.error || 'El enlace no es válido o ha caducado.') }
      })
      .catch(() => { setEstado('error'); setMensaje('Error de conexión') })
  }, [])

  return (
    <div className="bg-apex-card border border-apex-border rounded-2xl p-8 shadow-2xl animate-fade-in text-center">
      <h2 className="text-xl font-bold mb-3">Verificación de email</h2>
      {estado === 'verificando' && <p className="text-apex-muted text-sm">Comprobando el enlace…</p>}
      {estado === 'ok' && (
        <>
          <p className="text-green-400 text-sm mb-6">✅ Email confirmado. Ya puedes suscribirte e inscribirte en campeonatos.</p>
          <Link href="/dashboard" className="inline-block px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white text-sm">Ir a APEX</Link>
        </>
      )}
      {estado === 'error' && (
        <>
          <p className="text-red-400 text-sm mb-6">{mensaje}</p>
          <Link href="/perfil" className="text-apex-red hover:underline text-sm font-medium">Reenviar desde mi perfil</Link>
        </>
      )}
    </div>
  )
}
