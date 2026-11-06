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

/**
 * TEMPORADA_GRATUITA_FORZADA=true en el entorno: temporada gratuita activa para todos, aunque el flag de la
 * BD esté apagado o falle su lectura. Se lee en cada llamada (también en el middleware Edge).
 */
export function temporadaGratuitaForzada(): boolean {
  return process.env.TEMPORADA_GRATUITA_FORZADA === 'true'
}

/** [DIAG] temporal: decisión de acceso sin datos personales (ni id, ni email, ni IP). QUITAR tras diagnosticar. */
export function diagAcceso(origen: string, d: Partial<DatosAcceso>, decision: string): void {
  console.log(`[DIAG] acceso ${origen}: decision=${decision} rol=${d.role ?? '-'} baneado=${!!d.baneado} suscripcion=${!!d.suscripcionActiva} flag=${d.temporadaGratuita ?? '-'} forzada=${temporadaGratuitaForzada()}`)
}

/** Acceso completo: no baneado y (admin || suscripción activa/gratuita no expirada || temporada gratuita activa o forzada). */
export function tieneAcceso(d: DatosAcceso): boolean {
  if (d.baneado) return false
  return d.role === 'ADMIN' || d.suscripcionActiva || d.temporadaGratuita || temporadaGratuitaForzada()
}
