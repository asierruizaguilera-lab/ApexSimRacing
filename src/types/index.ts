export type UserRole = 'ADMIN' | 'PILOTO'
export type Disciplina = 'RALLY' | 'CIRCUITO' | 'DRIFT' | 'KARTCROSS' | 'MONOPLAZA'
export type Simulador = 'ASSETTO_CORSA' | 'EA_WRC' | 'DIRT_RALLY' | 'F1_24' | 'BEAMNG'
export type EstadoCampeonato = 'PROXIMO' | 'ACTIVO' | 'FINALIZADO'
export type EstadoCarrera = 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA'
export type EstadoInscripcion = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA'
export type CanalChat = 'GENERAL' | 'RALLY' | 'CIRCUITO' | 'DRIFT' | 'ANUNCIOS'
export type TipoNotificacion = 'CARRERA_PROXIMA' | 'RESULTADO_PUBLICADO' | 'INSCRIPCION_CONFIRMADA' | 'NUEVA_CARRERA' | 'NUEVO_CAMPEONATO'
export type TipoQueja = 'INCIDENCIA_CARRERA' | 'QUEJA_GENERAL'
export type EstadoQueja = 'ABIERTA' | 'EN_REVISION' | 'RESUELTA' | 'ARCHIVADA'
export type TipoSancion = 'ADVERTENCIA' | 'PENALIZACION_PUNTOS' | 'EXCLUSION_CARRERA' | 'SUSPENSION_TEMPORAL' | 'BAN_PERMANENTE'

export interface PilotoStats {
  totalCarreras: number
  totalVictorias: number
  totalPodios: number
  totalPuntos: number
  rankingGlobal?: number
}

export interface MensajeChatType {
  id: string
  userId: string
  canal: CanalChat
  contenido: string
  creadoEn: string | Date
  eliminado: boolean
  user: {
    id: string
    username: string
    avatar: string | null
    role: UserRole
  }
}
