'use client'

// Error en el layout raíz: se renderiza sin el layout, así que lleva su propio <html> y estilos mínimos
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111111', color: '#F5F5F5', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 16, maxWidth: 420 }}>
          <p style={{ fontSize: 56, fontWeight: 900, color: '#C0392B', margin: 0 }}>500</p>
          <h1 style={{ fontSize: 20, margin: '8px 0' }}>Algo ha fallado</h1>
          <p style={{ color: '#AAAAAA', fontSize: 14 }}>Ha ocurrido un error inesperado. Inténtalo de nuevo en unos segundos.</p>
          {error.digest && <p style={{ color: '#666', fontSize: 12, fontFamily: 'monospace' }}>Ref: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: '10px 20px', background: '#C0392B', color: 'white', border: 0, borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
