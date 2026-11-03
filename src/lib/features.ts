// Flags de funcionalidades. Por defecto apagadas: solo se activan con el valor exacto 'true'.
// Se leen en tiempo de ejecución (no en build), así que basta con cambiar la variable y reiniciar.
// server.js aplica las mismas flags para devolver 404 en las rutas y en los eventos de socket.

export function featureEquipos(): boolean {
  return process.env.FEATURE_EQUIPOS === 'true'
}

export function featureDM(): boolean {
  return process.env.FEATURE_DM === 'true'
}
