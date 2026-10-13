import { prisma } from './prisma'

const CONFIG_ID = 'global'

/** Modo "Temporada gratuita": todos los usuarios registrados tienen acceso completo sin suscripción. */
export async function getTemporadaGratuitaActiva(): Promise<boolean> {
  const config = await prisma.configGlobal.findUnique({
    where: { id: CONFIG_ID },
    select: { temporadaGratuitaActiva: true },
  })
  return !!config?.temporadaGratuitaActiva
}

export async function setTemporadaGratuitaActiva(activa: boolean) {
  return prisma.configGlobal.upsert({
    where: { id: CONFIG_ID },
    update: { temporadaGratuitaActiva: activa },
    create: { id: CONFIG_ID, temporadaGratuitaActiva: activa },
  })
}
