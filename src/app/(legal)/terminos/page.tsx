export const metadata = { title: 'Términos y condiciones' }

export default function TerminosPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-apex-muted">
      <div>
        <h1 className="text-2xl font-bold text-apex-text mb-2">Términos y condiciones</h1>
        <p className="text-xs">Última actualización: 25 de octubre de 2026 · <strong className="text-yellow-400">[REVISAR ASESOR]</strong></p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">1. Quiénes somos</h2>
        <p>
          APEX SimRacing es una comunidad de simracing con campeonatos, academia, equipos y chat.
          Titular: <strong className="text-yellow-400">[REVISAR ASESOR: razón social, NIF, domicilio y email de contacto]</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">2. Cuenta</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Debes dar datos veraces y mantener la contraseña en secreto. Eres responsable de lo que se haga con tu cuenta.</li>
          <li>Para suscribirte o inscribirte en campeonatos debes confirmar tu email.</li>
          <li>Puedes eliminar tu cuenta en cualquier momento desde tu perfil.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">3. Suscripciones y pagos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Los planes se cobran mensualmente a través de PayPal y se renuevan automáticamente hasta que los canceles.</li>
          <li>Puedes cancelar cuando quieras desde la plataforma o desde PayPal; mantendrás el acceso según las condiciones de tu plan.</li>
          <li>El precio Founder se mantiene mientras la suscripción siga activa; si la cancelas, se pierde.</li>
          <li>Derecho de desistimiento, reembolsos e impuestos aplicables: <strong className="text-yellow-400">[REVISAR ASESOR]</strong>.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">4. Normas de la comunidad</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Respeto en el chat, los mensajes directos y en pista. Nada de insultos, acoso, spam, contenido ilegal o datos personales de terceros.</li>
          <li>Los administradores pueden moderar mensajes, silenciar, sancionar o bloquear cuentas que incumplan las normas, y resolver incidencias de carrera.</li>
          <li>Prohibido intentar acceder a cuentas ajenas, saltarse los límites de la plataforma o atacar el servicio.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">5. Contenido</h2>
        <p>
          Lo que publiques (mensajes, imágenes, enlaces) sigue siendo tuyo, pero nos das permiso para mostrarlo dentro de la plataforma.
          Los contenidos de la Academia y la marca APEX son nuestros o de sus autores. <strong className="text-yellow-400">[REVISAR ASESOR]</strong>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">6. Responsabilidad y cambios</h2>
        <p>
          Intentamos que el servicio esté siempre disponible, pero no podemos garantizarlo. Podemos actualizar estos términos;
          si el cambio es importante te avisaremos. Ley aplicable y jurisdicción: <strong className="text-yellow-400">[REVISAR ASESOR]</strong>.
        </p>
      </section>
    </article>
  )
}
