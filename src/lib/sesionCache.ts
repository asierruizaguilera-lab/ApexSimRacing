// server.js guarda 15 s el estado de cada usuario con sesión (baneado, eliminado…). Al cambiarlo se
// borra la entrada para que la siguiente petición lo lea ya de la BD.
export function invalidarCacheSesion(userId: string) {
  try {
    ;(globalThis as any).__apexSesionCache?.delete(userId)
  } catch {}
}
