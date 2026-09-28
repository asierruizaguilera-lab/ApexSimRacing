/**
 * Catálogo oficial de coches del Garaje APEX.
 * Fuente única de verdad usada por prisma/seed.ts y scripts/update-cars.ts.
 */
import { PrismaClient, Disciplina, PlanSuscripcion } from '@prisma/client'

const IMG = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=400`

export const PLACEHOLDER_COCHE = '/placeholder-car.jpg'

export interface CocheCatalogo {
  nombre: string
  /** Nombres anteriores con los que puede existir en BD (renombrados / variantes del seed antiguo) */
  alias: string[]
  disciplina: Disciplina
  planMinimo: PlanSuscripcion
  linkDescarga: string | null
  descripcion: string
  imagenUrl: string
}

export const COCHES_CATALOGO: CocheCatalogo[] = [
  // ── ROOKIE ────────────────────────────────────────────────────────────────
  {
    nombre: 'Peugeot 106 Rally', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ROOKIE,
    linkDescarga: 'https://drive.google.com/drive/folders/1m66UBc91GeD1PFIf5AhnlZduoTEB8GNG',
    descripcion: 'El abuelo de los rallyes de base. Pequeño, ruidoso y con más carácter que un piloto cabreado. Ideal para aprender a sufrir con estilo.',
    imagenUrl: IMG('Peugeot_106_rally_2023.jpg'),
  },
  {
    nombre: 'Citroën Saxo Kit Car', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ROOKIE,
    linkDescarga: 'https://drive.google.com/drive/folders/1N6Y-1UsJ9-w_hKTk0b93mIxQ-XUa6Rpi',
    descripcion: 'El primo francés del 106 que se cree mejor que él. Spoiler: tiene razón. Con este aprendes que hay curvas y luego hay CURVAS.',
    imagenUrl: IMG('Citroën_Saxo_at_the_2019_Mouzon-Frezelle_rally_2.jpg'),
  },
  {
    nombre: 'Kart 125cc', alias: ['Kart 125cc Básico'],
    disciplina: Disciplina.KARTCROSS, planMinimo: PlanSuscripcion.ROOKIE,
    linkDescarga: null,
    descripcion: 'El kart. El origen de todo. Si no has rodado en kart, ¿realmente has vivido? Advertencia: puede causar adicción severa y ganas de comprarte uno de verdad.',
    imagenUrl: IMG('Kart_Start.JPG'),
  },
  {
    nombre: 'Honda Civic EG6', alias: [],
    disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ROOKIE,
    linkDescarga: 'https://drive.google.com/drive/folders/1SSecjYJnZfK7anUGmeXW4A8ADuKPM4vK',
    descripcion: 'El clásico del garaje que todo el mundo tiene pero nadie sabe cómo llegó ahí. Fiable como un reloj suizo pero con más oversteer.',
    imagenUrl: IMG('Honda_Civic_EG6_1994_(8880223740).jpg'),
  },
  {
    nombre: 'Formula Ford', alias: [],
    disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.ROOKIE,
    linkDescarga: 'https://drive.google.com/drive/folders/1nf7R_R702ZZsFgL-2NA7BNCh80MXwqSq',
    descripcion: 'Tu primer monoplaza. Sin alerón trasero, sin ABS, sin excusas. Aquí o aprendes aerodinámica o te comes los neumáticos.',
    imagenUrl: IMG('Formula_Ford_Ecoboost_2012_4.jpg'),
  },

  // ── AMATEUR ───────────────────────────────────────────────────────────────
  {
    nombre: 'Mitsubishi Lancer Evo VI', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.AMATEUR,
    linkDescarga: 'https://drive.google.com/drive/folders/10_Rk2iIFcXMtbFhb6oODEcJ27rVDr8D7',
    descripcion: 'La bestia japonesa de los 90 que hizo llorar a Subaru durante una década. 4WD, turbo y la sonrisa garantizada en cada curva de grava.',
    imagenUrl: IMG('Mitsubishi_Lancer_Evolution_VI_-_Jozef_Jágrik.JPG'),
  },
  {
    nombre: 'Subaru Impreza WRX', alias: ['Subaru Impreza WRX STI'],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.AMATEUR,
    linkDescarga: 'https://drive.google.com/drive/folders/1WobQWafCN6dwgvJLdDjb4BsOzAe-qKBk',
    descripcion: 'El rival eterno del Evo. El sonido del boxer al ralentí es básicamente música clásica para cualquier fan del WRC. McRae lo hubiera aprobado.',
    imagenUrl: IMG('1995_Subaru_Impreza_WRC_Group_A.jpg'),
  },
  {
    nombre: 'BMW E36 320i BTCC', alias: ['BMW E30', 'BMW E30 M3'],
    disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.AMATEUR,
    linkDescarga: 'https://drive.google.com/drive/folders/10F2IvWgOFTwIbewLzsuJezpUFnKFlGWP',
    descripcion: 'Turismo british de los 90 con más actitud que un Rolls en un aparcamiento de supermercado. En circuito es donde este señor demuestra quién manda.',
    imagenUrl: IMG('David_Brabham_-_BMW_318i_at_the_British_GP_support_round_of_the_BTCC_1995_(49772810511).jpg'),
  },
  {
    nombre: 'Formula Renault', alias: ['Formula Renault 2.0'],
    disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.AMATEUR,
    linkDescarga: 'https://drive.google.com/drive/folders/1LICiJW3RPMbp7fu7ZSE8ve_sKgE_PgoU',
    descripcion: 'El primer paso serio hacia la F1. Por aquí pasaron Alonso, Vettel y Räikkönen. Tú también puedes... en simulador.',
    imagenUrl: IMG('Formula_Renault_at_Silverstone_2008.JPG'),
  },

  // ── PRO ───────────────────────────────────────────────────────────────────
  {
    nombre: 'Ford Fiesta Rally2', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.PRO,
    linkDescarga: null,
    descripcion: 'El David contra Goliat del WRC. Pequeño por fuera, una bestia por dentro. Con este coche se ganan campeonatos y se pierden amigos en las notas.',
    imagenUrl: IMG('Rally_Poland_2021_Cais_Erik_01.jpg'),
  },
  {
    nombre: 'Škoda Fabia Rally2', alias: ['Skoda Fabia Rally2'],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.PRO,
    linkDescarga: null,
    descripcion: 'El checo que nadie esperaba y que ganó todo. Subestimado en el paddock, sobrerendidor en el tramo. La sorpresa agradable del campeonato.',
    imagenUrl: IMG('Rally_de_Portugal_2019_-_ŠKODA_FABIA_Rally2_evo.jpg'),
  },
  {
    nombre: 'Porsche 992 GT3', alias: ['Porsche 911 GT3', 'Porsche 911 GT3 R'],
    disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.PRO,
    linkDescarga: 'https://drive.google.com/drive/folders/1XUzhRvR8C7f6QccGKq_f8QgLz-Q0u0xD',
    descripcion: 'El GT3 por excelencia. Motor trasero, filosofía alemana y la capacidad de hacerte sentir piloto profesional aunque hayas empezado hace tres semanas.',
    imagenUrl: IMG('Porsche_992_GT3_1X7A0323.jpg'),
  },
  {
    nombre: 'Tatuus F3', alias: ['Dallara F3'],
    disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.PRO,
    linkDescarga: 'https://drive.google.com/drive/folders/15oz8cVlSwN5wP5T9tzB6ahgsWLoB1eQV',
    descripcion: 'Fórmula 3 de verdad. Aquí el downforce empieza a ser tu mejor amigo. Velocidades que te hacen reconsiderar tus decisiones de vida.',
    imagenUrl: IMG('Tatuus_T-318_W_Series.jpg'),
  },

  // ── ELITE ─────────────────────────────────────────────────────────────────
  {
    nombre: 'Toyota GR Yaris Rally1', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ELITE,
    linkDescarga: null,
    descripcion: 'La cima del rally moderno. Híbrido, brutal y con más tecnología que un cohete espacial. Si llegas aquí, ya no hay excusas para no ser rápido.',
    imagenUrl: IMG('2025_Toyota_GR_Yaris_Rally_1_Evans.jpg'),
  },
  {
    nombre: 'Ford Puma Rally1', alias: [],
    disciplina: Disciplina.RALLY, planMinimo: PlanSuscripcion.ELITE,
    linkDescarga: null,
    descripcion: 'El zorro rojo de Malcolm Wilson. Con este coche se escribe historia en los tramos. Advertencia: puede generar dependencia de los tramos de noche.',
    imagenUrl: IMG('WRC_Central_European_Rallye_2023_Nr._8_(4).jpg'),
  },
  {
    nombre: 'Ferrari 488 GT3', alias: [],
    disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ELITE,
    linkDescarga: null,
    descripcion: 'Rojo, italiano y con el sonido de los dioses del motor. En GT3 no hay nada más épico que cruzar la meta con el cavallino rampante delante.',
    imagenUrl: IMG('Ferrari_488_GT3.jpg'),
  },
  {
    nombre: 'Lamborghini Huracán GT3', alias: ['Lamborghini Huracan GT3'],
    disciplina: Disciplina.CIRCUITO, planMinimo: PlanSuscripcion.ELITE,
    linkDescarga: null,
    descripcion: "El toro de Sant'Agata en modo competición. Porque a veces ser discreto está sobrevalorado. Para los que quieren ganar Y que se les vea llegar.",
    imagenUrl: IMG('2023_Lamborghini_Huracan_GT3_EVO_II.jpg'),
  },
  {
    nombre: 'Dallara F2', alias: [],
    disciplina: Disciplina.MONOPLAZA, planMinimo: PlanSuscripcion.ELITE,
    linkDescarga: 'https://drive.google.com/drive/folders/1KkPxJoUwlQ4uvC37tQ4tWfK-XsMwqXCN',
    descripcion: 'Un paso antes de la F1. Si dominas esto, solo te falta un patrocinador de 50 millones. El simulador te da lo primero gratis.',
    imagenUrl: IMG('FIA_F2_Austria_2018_Nr._07_Aitken_(3).jpg'),
  },
]

/** Coches retirados del catálogo: se eliminan de la BD (y sus desbloqueos, por cascada). */
export const COCHES_ELIMINADOS = [
  'Nissan S13', 'Nissan S13 Drift', 'Nissan Silvia S13',
  'Nissan R35 GT-R Drift', 'Nissan GT-R R35 Drift', 'Nissan GT-R Drift',
]

const PLAN_ORDER: PlanSuscripcion[] = ['ROOKIE', 'AMATEUR', 'PRO', 'ELITE']

export interface ResumenSync {
  eliminados: string[]
  renombrados: string[]
  creados: string[]
  actualizados: string[]
  desbloqueosNuevos: number
}

/**
 * Sincroniza la tabla `coches` con el catálogo. Nunca toca usuarios ni suscripciones.
 * - force=true  → sobrescribe link, descripción, imagen, disciplina y plan de todos los coches.
 * - force=false → la primera vez (coche sin imagenUrl) aplica los datos del catálogo; después solo
 *                 rellena campos vacíos (respeta ediciones hechas desde el panel admin).
 */
export async function sincronizarCoches(prisma: PrismaClient, { force }: { force: boolean }): Promise<ResumenSync> {
  const resumen: ResumenSync = { eliminados: [], renombrados: [], creados: [], actualizados: [], desbloqueosNuevos: 0 }
  const norm = (s: string) => s.trim().toLowerCase()

  // 1. Eliminar coches retirados
  const eliminadosSet = new Set(COCHES_ELIMINADOS.map(norm))
  const todos = await prisma.coche.findMany()
  for (const c of todos) {
    if (eliminadosSet.has(norm(c.nombre))) {
      await prisma.coche.delete({ where: { id: c.id } })
      resumen.eliminados.push(c.nombre)
    }
  }

  // 2. Renombrar / crear / actualizar cada coche del catálogo
  const restantes = await prisma.coche.findMany()
  for (const item of COCHES_CATALOGO) {
    const nombres = [item.nombre, ...item.alias].map(norm)
    const existente =
      restantes.find(c => norm(c.nombre) === norm(item.nombre)) ??
      restantes.find(c => nombres.includes(norm(c.nombre)))

    if (!existente) {
      await prisma.coche.create({
        data: {
          nombre: item.nombre, disciplina: item.disciplina, planMinimo: item.planMinimo,
          linkDescarga: item.linkDescarga, descripcion: item.descripcion, imagenUrl: item.imagenUrl,
          activo: true,
        },
      })
      resumen.creados.push(item.nombre)
      continue
    }

    const renombrar = existente.nombre !== item.nombre
    const data: Record<string, unknown> = {}
    if (renombrar) {
      data.nombre = item.nombre
      data.modAC = null // el nombre de carpeta del mod antiguo ya no corresponde a este coche
      resumen.renombrados.push(`${existente.nombre} → ${item.nombre}`)
    }

    // Sin imagenUrl = coche aún no sincronizado con este catálogo (campo nuevo) → aplicar datos completos
    if (force || renombrar || !existente.imagenUrl) {
      data.disciplina = item.disciplina
      data.planMinimo = item.planMinimo
      data.linkDescarga = item.linkDescarga
      data.descripcion = item.descripcion
      data.imagenUrl = item.imagenUrl
    } else {
      if (!existente.linkDescarga && item.linkDescarga) data.linkDescarga = item.linkDescarga
      if (!existente.descripcion) data.descripcion = item.descripcion
    }

    if (Object.keys(data).length > 0) {
      await prisma.coche.update({ where: { id: existente.id }, data })
      if (!renombrar) resumen.actualizados.push(item.nombre)
    }
  }

  // 3. Asegurar que cada suscriptor activo tiene desbloqueados todos los coches de su plan
  const suscripciones = await prisma.suscripcion.findMany({
    where: { estado: { in: ['ACTIVA', 'GRATUITA'] } },
    select: { userId: true, plan: true },
  })
  const coches = await prisma.coche.findMany({ where: { activo: true }, select: { id: true, planMinimo: true } })
  for (const s of suscripciones) {
    const planes = PLAN_ORDER.slice(0, PLAN_ORDER.indexOf(s.plan) + 1)
    const ids = coches.filter(c => planes.includes(c.planMinimo)).map(c => c.id)
    if (ids.length === 0) continue
    const { count } = await prisma.cocheDesbloqueado.createMany({
      data: ids.map(cocheId => ({ userId: s.userId, cocheId })),
      skipDuplicates: true,
    })
    resumen.desbloqueosNuevos += count
  }

  return resumen
}
