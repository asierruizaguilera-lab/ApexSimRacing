export type Aviso = 'aviso_ronda' | 'recordatorio_carrera' | 'ultima_hora_carrera'
export type Ronda = { ronda: number; campeonatoId: string; circuito: string; entrenamientos: Date[]; carrera: Date }
export type AvisoPendiente = { aviso: Aviso; ronda: number; campeonatoId: string; circuito: string; objetivo: Date; entrenamientos: Date[]; carrera: Date; referencia: string }
export const AVISOS: Readonly<Record<Aviso, Readonly<{ antelacionMs: number; ventanaMs: number }>>>
export function parseRoundSchedule(raw: string | undefined): { rondas: Ronda[]; error?: string }
export function avisosPendientes(rondas: Ronda[], ahora: Date): AvisoPendiente[]
export function minutoTieneTrabajo(rondas: Ronda[], ahora: Date): boolean
