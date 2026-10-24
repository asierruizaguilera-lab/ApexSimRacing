'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Envía un beacon por cada cambio de ruta para el log de actividad. Solo la ruta, sin query.
export function RastreadorVistas() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    try {
      const body = new Blob([JSON.stringify({ ruta: pathname })], { type: 'application/json' })
      if (!navigator.sendBeacon?.('/api/actividad/vista', body)) {
        fetch('/api/actividad/vista', { method: 'POST', body, keepalive: true }).catch(() => null)
      }
    } catch {}
  }, [pathname])

  return null
}
