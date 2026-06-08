import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DISCIPLINA_COLORS: Record<string, string> = {
  RALLY: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CIRCUITO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DRIFT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  KARTCROSS: 'bg-green-500/20 text-green-400 border-green-500/30',
  MONOPLAZA: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const DISCIPLINA_LABELS: Record<string, string> = {
  RALLY: 'Rally',
  CIRCUITO: 'Circuito',
  DRIFT: 'Drift',
  KARTCROSS: 'Kartcross',
  MONOPLAZA: 'Monoplaza',
}

export const SIMULADOR_LABELS: Record<string, string> = {
  ASSETTO_CORSA: 'Assetto Corsa',
  EA_WRC: 'EA WRC',
  DIRT_RALLY: 'Dirt Rally 2.0',
  F1_24: 'F1 24',
  BEAMNG: 'BeamNG.drive',
}

export const ESTADO_CAMPEONATO_LABELS: Record<string, string> = {
  PROXIMO: 'Próximo',
  ACTIVO: 'Activo',
  FINALIZADO: 'Finalizado',
}

export const PAISES: Record<string, string> = {
  ES: '🇪🇸',
  MX: '🇲🇽',
  AR: '🇦🇷',
  CO: '🇨🇴',
  CL: '🇨🇱',
  VE: '🇻🇪',
  PE: '🇵🇪',
  EC: '🇪🇨',
  UY: '🇺🇾',
  BO: '🇧🇴',
  PY: '🇵🇾',
  CR: '🇨🇷',
  PA: '🇵🇦',
  GT: '🇬🇹',
  HN: '🇭🇳',
  SV: '🇸🇻',
  DO: '🇩🇴',
  CU: '🇨🇺',
  PR: '🇵🇷',
  NI: '🇳🇮',
}

export const PAISES_NOMBRES: Record<string, string> = {
  ES: 'España',
  MX: 'México',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  VE: 'Venezuela',
  PE: 'Perú',
  EC: 'Ecuador',
  UY: 'Uruguay',
  BO: 'Bolivia',
  PY: 'Paraguay',
  CR: 'Costa Rica',
  PA: 'Panamá',
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  DO: 'República Dominicana',
  CU: 'Cuba',
  PR: 'Puerto Rico',
  NI: 'Nicaragua',
}

export function getPaisFlag(pais?: string | null): string {
  if (!pais) return '🌍'
  return PAISES[pais] || '🌍'
}

export function getPaisNombre(pais?: string | null): string {
  if (!pais) return 'Internacional'
  return PAISES_NOMBRES[pais] || pais
}

export function formatFecha(date: Date | string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date))
}

export function formatFechaHora(date: Date | string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  if (days < 7) return `hace ${days}d`
  return formatFecha(date)
}

export function getPositionColor(pos: number): string {
  if (pos === 1) return 'text-yellow-400'
  if (pos === 2) return 'text-gray-300'
  if (pos === 3) return 'text-amber-600'
  return 'text-apex-text'
}

export function getPositionBg(pos: number): string {
  if (pos === 1) return 'bg-yellow-400/10 border-yellow-400/30'
  if (pos === 2) return 'bg-gray-300/10 border-gray-300/30'
  if (pos === 3) return 'bg-amber-600/10 border-amber-600/30'
  return ''
}

export function generateInitialsAvatar(username: string): string {
  const initials = username.slice(0, 2).toUpperCase()
  const colors = ['#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#E67E22', '#16A085']
  const color = colors[username.charCodeAt(0) % colors.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" fill="${color}"/><text x="40" y="52" font-family="system-ui,sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${initials}</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export const PUNTOS_SISTEMA = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

export function calcularPuntos(posicion: number, vueltaRapida: boolean = false): number {
  const pts = PUNTOS_SISTEMA[posicion - 1] || 0
  return pts + (vueltaRapida ? 1 : 0)
}

// --- Suscripciones ---

export const PLAN_LABELS: Record<string, string> = {
  ROOKIE: 'Rookie',
  AMATEUR: 'Amateur',
  PRO: 'Pro',
  ELITE: 'Elite',
}

export const PLAN_PRECIOS: Record<string, number> = {
  ROOKIE: 5,
  AMATEUR: 10,
  PRO: 15,
  ELITE: 25,
}

export const PLAN_COLORS: Record<string, string> = {
  ROOKIE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  AMATEUR: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PRO: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  ELITE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

export const PLAN_FEATURES: Record<string, string[]> = {
  ROOKIE: [
    'Peugeot 106 Rally, Saxo Kit Car',
    'Kart 125cc básico',
    'Honda Civic EG6',
    'Formula Ford',
    'Acceso a campeonatos',
  ],
  AMATEUR: [
    'Todo lo del plan Rookie',
    'Mitsubishi Lancer Evo VI',
    'Subaru Impreza WRX',
    'BMW E30, Nissan S13 Drift',
    'Formula Renault',
  ],
  PRO: [
    'Todo lo del plan Amateur',
    'Ford Fiesta Rally2, Škoda Fabia Rally2',
    'Porsche 911 GT3',
    'Nissan R35 Drift',
    'Dallara F3',
  ],
  ELITE: [
    'Acceso completo a todos los coches',
    'Toyota GR Yaris Rally1 & Ford Puma Rally1',
    'Ferrari 488 GT3 & Lamborghini Huracán GT3',
    'Dallara F2',
    'Soporte prioritario',
  ],
}

export const PLAN_ORDER = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

export const ESTADO_SUSCRIPCION_LABELS: Record<string, string> = {
  ACTIVA: 'Activa',
  CANCELADA: 'Cancelada',
  EXPIRADA: 'Expirada',
  PENDIENTE: 'Pendiente',
}
