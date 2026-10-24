'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CLAVE = 'apex-aviso-cookies'

// Aviso informativo: la plataforma solo usa cookies técnicas, así que no hay nada que aceptar o rechazar
export function AvisoCookies() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLAVE)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  function cerrar() {
    try { localStorage.setItem(CLAVE, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null
  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-[100] bg-apex-card border border-apex-border rounded-xl shadow-2xl p-4 text-sm">
      <p className="text-apex-muted">
        Solo usamos cookies técnicas, imprescindibles para iniciar sesión y que la web funcione. No usamos cookies de
        analítica ni de publicidad. <Link href="/cookies" className="text-apex-red hover:underline">Más información</Link>
      </p>
      <button onClick={cerrar} className="mt-3 w-full py-2 rounded-lg bg-apex-red hover:bg-apex-red-dark text-white font-semibold">
        Entendido
      </button>
    </div>
  )
}
