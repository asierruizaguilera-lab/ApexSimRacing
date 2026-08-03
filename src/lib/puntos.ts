import type { Disciplina } from '@prisma/client'

const TABLA_CIRCUITO = [25, 20, 16, 13, 11, 9, 7, 5, 3, 1]
const TABLA_RALLY = [25, 20, 16, 13, 11, 9, 7, 5, 3, 1] // 11º en adelante recibe 1 punto

export function calcularPuntos(
  posicion: number,
  disciplina: Disciplina,
  numEtapas: number = 1,
  esDNF: boolean = false,
  vueltaRapida: boolean = false
): number {
  if (esDNF) return 0

  if (disciplina === 'RALLY' || disciplina === 'SUBIDAS') {
    const puntoBase = posicion <= 10 ? TABLA_RALLY[posicion - 1] : 1
    const multiplicador = disciplina === 'RALLY' ? numEtapas : 1
    return puntoBase * multiplicador
  }

  // CIRCUITO, DRIFT, KARTCROSS, MONOPLAZA: solo top 10 puntúan, + 1 por vuelta rápida
  const puntos = posicion <= 10 ? TABLA_CIRCUITO[posicion - 1] : 0
  return puntos + (vueltaRapida ? 1 : 0)
}

// En Rally/Subidas no existe el punto de vuelta rápida
export function tieneVueltaRapida(disciplina: Disciplina): boolean {
  return disciplina !== 'RALLY' && disciplina !== 'SUBIDAS'
}
