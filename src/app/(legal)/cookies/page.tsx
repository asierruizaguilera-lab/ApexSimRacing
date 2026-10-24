export const metadata = { title: 'Política de cookies' }

const COOKIES = [
  { nombre: 'next-auth.session-token', finalidad: 'Mantener tu sesión iniciada', duracion: '7 días', tipo: 'Técnica (esencial)' },
  { nombre: 'next-auth.csrf-token', finalidad: 'Proteger el inicio de sesión frente a ataques CSRF', duracion: 'Sesión', tipo: 'Técnica (esencial)' },
  { nombre: 'next-auth.callback-url', finalidad: 'Volver a la página correcta tras iniciar sesión', duracion: 'Sesión', tipo: 'Técnica (esencial)' },
  { nombre: 'apex-aviso-cookies (localStorage)', finalidad: 'Recordar que ya has visto este aviso', duracion: 'Persistente', tipo: 'Técnica (esencial)' },
]

export default function CookiesPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-apex-muted">
      <div>
        <h1 className="text-2xl font-bold text-apex-text mb-2">Política de cookies</h1>
        <p className="text-xs">Última actualización: 25 de octubre de 2026 · <strong className="text-yellow-400">[REVISAR ASESOR]</strong></p>
      </div>

      <p>
        APEX SimRacing <strong>solo usa cookies técnicas, esenciales para que la plataforma funcione</strong>. No usamos cookies
        de analítica, publicidad ni perfiles, por eso no te pedimos consentimiento: solo te informamos.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-apex-border rounded-lg">
          <thead className="bg-apex-card text-apex-text">
            <tr><th className="p-2">Cookie</th><th className="p-2">Finalidad</th><th className="p-2">Duración</th><th className="p-2">Tipo</th></tr>
          </thead>
          <tbody>
            {COOKIES.map(c => (
              <tr key={c.nombre} className="border-t border-apex-border">
                <td className="p-2 font-mono">{c.nombre}</td><td className="p-2">{c.finalidad}</td><td className="p-2">{c.duracion}</td><td className="p-2">{c.tipo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">Contenido de terceros</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PayPal:</strong> al pagar, PayPal puede usar sus propias cookies para procesar el pago y prevenir el fraude.</li>
          <li><strong>YouTube:</strong> los vídeos de la Academia usan el modo de privacidad mejorada (youtube-nocookie.com).</li>
          <li><strong>Google Slides / Drive:</strong> las presentaciones incrustadas pueden usar cookies de Google.</li>
        </ul>
        <p><strong className="text-yellow-400">[REVISAR ASESOR: confirmar si el contenido de terceros requiere consentimiento previo]</strong></p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">Cómo desactivarlas</h2>
        <p>Puedes borrar o bloquear las cookies desde tu navegador, pero sin las técnicas no podrás iniciar sesión.</p>
      </section>
    </article>
  )
}
