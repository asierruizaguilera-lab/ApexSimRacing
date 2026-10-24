import Link from 'next/link'

export const metadata = { title: 'Página no encontrada' }

export default function NotFound() {
  return (
    <div className="min-h-screen bg-apex-bg flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-black text-apex-red mb-2">404</p>
        <h1 className="text-xl font-bold mb-2">Te has salido de la pista</h1>
        <p className="text-apex-muted text-sm mb-6">La página que buscas no existe o se ha movido.</p>
        <Link href="/" className="inline-block px-6 py-2.5 bg-apex-red hover:bg-apex-red-dark rounded-xl font-semibold text-white text-sm">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
