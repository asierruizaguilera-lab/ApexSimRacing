// Regla única de acceso a la plataforma. Sin imports de Prisma ni de Node: la usan el middleware
// (Edge), los server components y las rutas API.

export type SuscripcionAcceso = { estado: string; fechaExpiracionManual: Date | string | null } | null | undefined

/** Suscripción ACTIVA o GRATUITA cuya fecha de expiración manual (si la tiene) no ha pasado. */
export function esAccesoActivo(suscripcion: SuscripcionAcceso): boolean {
  if (!suscripcion) return false
  if (suscripcion.estado !== 'ACTIVA' && suscripcion.estado !== 'GRATUITA') return false
  if (suscripcion.fechaExpiracionManual && new Date(suscripcion.fechaExpiracionManual) < new Date()) return false
  return true
}

export type DatosAcceso = {
  role?: string | null
  baneado?: boolean | null
  suscripcionActiva: boolean
  temporadaGratuita: boolean
}

/** Acceso completo: no baneado y (admin || suscripción activa/gratuita no expirada || modo temporada gratuita activo). */
export function tieneAcceso(d: DatosAcceso): boolean {
  if (d.baneado) return false
  return d.role === 'ADMIN' || d.suscripcionActiva || d.temporadaGratuita
}
