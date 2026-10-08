import { redirect } from 'next/navigation'

// Conserva los parámetros (?ref=, ?plan=) para que el código de referido llegue prerellenado
export default function RegistroPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') params.set(k, v)
  }
  const qs = params.toString()
  redirect(qs ? `/register?${qs}` : '/register')
}
