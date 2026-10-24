export const metadata = { title: 'Política de privacidad' }

export default function PrivacidadPage() {
  return (
    <article className="space-y-6 text-sm leading-relaxed text-apex-muted">
      <div>
        <h1 className="text-2xl font-bold text-apex-text mb-2">Política de privacidad</h1>
        <p className="text-xs">Última actualización: 25 de octubre de 2026 · <strong className="text-yellow-400">[REVISAR ASESOR]</strong></p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">1. Responsable del tratamiento</h2>
        <p>
          APEX SimRacing — <strong className="text-yellow-400">[REVISAR ASESOR: razón social o nombre del titular, NIF, domicilio y email de contacto de privacidad]</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">2. Qué datos tratamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Cuenta:</strong> nombre de piloto, email, contraseña (guardada cifrada con bcrypt, nunca en claro), país, biografía y avatar.</li>
          <li><strong>Actividad deportiva:</strong> inscripciones, resultados, puntos, equipo y estadísticas.</li>
          <li><strong>Comunicaciones:</strong> mensajes del chat de comunidad, del chat de equipo y mensajes directos, incidencias y pruebas aportadas.</li>
          <li><strong>Pago:</strong> plan, estado de la suscripción e identificador de suscripción de PayPal. No vemos ni guardamos los datos de tu tarjeta o cuenta PayPal.</li>
          <li><strong>Seguridad y uso:</strong> registro de accesos (inicios de sesión, cambios de plan, errores), páginas visitadas dentro de la plataforma y navegador. La IP se guarda truncada y cifrada (hash), no completa.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">3. Para qué y con qué base legal</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prestar el servicio (cuenta, campeonatos, chat, equipos, suscripción): ejecución del contrato.</li>
          <li>Cobrar la suscripción a través de PayPal: ejecución del contrato.</li>
          <li>Seguridad, prevención de fraude y abuso (límites de intentos, registro de accesos): interés legítimo.</li>
          <li>Emails transaccionales (bienvenida, verificación, recuperación de contraseña, avisos de carrera y resultados): ejecución del contrato.</li>
          <li>Obligaciones fiscales y contables sobre los pagos: obligación legal. <strong className="text-yellow-400">[REVISAR ASESOR]</strong></li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">4. Cuánto tiempo los conservamos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Datos de la cuenta: mientras la cuenta esté activa. Al eliminarla se anonimizan.</li>
          <li>Registro de páginas visitadas: 90 días. Resto del registro de actividad y seguridad: 12 meses.</li>
          <li>Datos de facturación: los plazos que exija la normativa fiscal. <strong className="text-yellow-400">[REVISAR ASESOR]</strong></li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">5. Con quién los compartimos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>PayPal</strong> (pagos), <strong>Resend</strong> (envío de emails), <strong>Render</strong> (alojamiento) y el proveedor de base de datos, como encargados del tratamiento.</li>
          <li>Contenido incrustado en la Academia: <strong>YouTube</strong> (modo sin cookies) y <strong>Google Slides/Drive</strong>.</li>
          <li>
            Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo con las garantías del RGPD
            (cláusulas contractuales tipo o decisión de adecuación). <strong className="text-yellow-400">[REVISAR ASESOR: listado y garantías de cada proveedor]</strong>
          </li>
        </ul>
        <p>Tu nombre de piloto, avatar, país, biografía y resultados son públicos para el resto de usuarios registrados.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">6. Tus derechos</h2>
        <p>
          Puedes acceder, rectificar, suprimir, oponerte, limitar el tratamiento y portar tus datos. Desde tu perfil puedes
          <strong> descargar todos tus datos en JSON</strong> y <strong>eliminar tu cuenta</strong> (se cancela la suscripción, incluida la de PayPal).
          Para el resto, escríbenos a <strong className="text-yellow-400">[REVISAR ASESOR: email de privacidad]</strong>.
          También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-apex-text">7. Menores</h2>
        <p>La plataforma no está dirigida a menores de 14 años. <strong className="text-yellow-400">[REVISAR ASESOR: edad mínima y consentimiento parental]</strong></p>
      </section>
    </article>
  )
}
