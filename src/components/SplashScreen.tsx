'use client'

import { useEffect, useState } from 'react'

// Duración total de la animación (ver keyframes apex-splash-* en globals.css)
const DURACION_MS = 2350

// Piezas del isotipo APEX redibujadas en SVG (a partir de logo-apex-a.jpg) para animarlas por separado.
// Las dos comparten viewBox, así que al apilarlas encajan en el logo completo.
const VIEWBOX = '390 218 460 335'
const PATH_A = 'M600,228 L705,228 L732,350 C705,356 680,360 655,364 L637,302 L641,367 C580,380 520,400 472,428 Z M665,416 L744,411 L775,541 L686,541 Z'
const PATH_TRAZO = 'M400,541 C440,480 500,420 600,392 C680,370 760,352 798,322 C822,300 810,262 712,228 C790,248 838,280 832,322 C826,362 770,385 690,405 C620,423 566,455 562,541 Z'

/**
 * Splash de entrada: se renderiza en el servidor (cubre la página desde el primer pintado) y se desmonta
 * al terminar la animación. Vive en el layout raíz, así que aparece en cada apertura/recarga de la app
 * pero no en las navegaciones internas.
 */
export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDone(true), DURACION_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {children}
      {!done && (
        <div className="apex-splash" aria-hidden="true">
          <div className="apex-splash-logo">
            <svg viewBox={VIEWBOX} className="apex-splash-pieza apex-splash-a">
              <path d={PATH_A} fill="#FFFFFF" fillRule="evenodd" />
            </svg>
            <svg viewBox={VIEWBOX} className="apex-splash-pieza apex-splash-trazo">
              <path d={PATH_TRAZO} fill="#C0392B" />
            </svg>
          </div>
        </div>
      )}
    </>
  )
}
