export type TipoMail = 'TRANSACCIONAL' | 'SERVICIO' | 'COMERCIAL'

export function evaluarElegibilidad(input: {
  tipo: TipoMail
  marketingConsent: boolean
  emailUnsubscribedAt: Date | null
}): { permitido: boolean; motivo?: 'baja' | 'sin_consentimiento' } {
  if (input.tipo === 'TRANSACCIONAL') return { permitido: true }
  if (input.emailUnsubscribedAt) return { permitido: false, motivo: 'baja' }
  if (input.tipo === 'COMERCIAL' && !input.marketingConsent) return { permitido: false, motivo: 'sin_consentimiento' }
  return { permitido: true }
}
