// EmailLog en memoria con la restricción única (userId, tipo, referencia) y updatedAt, para las pruebas.
// Cada operación cede el turno (await) para que las llamadas simultáneas se intercalen de verdad.
type Fila = { id: string; userId: string; tipo: string; referencia: string; estado: string; detalle: string | null; intentos: number; createdAt: Date; updatedAt: Date }

export function crearFakeEmailLog() {
  const filas: Fila[] = []
  let n = 0
  let reloj = Date.now()
  const ahora = () => new Date(++reloj)
  const ceder = () => new Promise(r => setTimeout(r, 0))
  const porClave = (w: any) => filas.find(f => f.userId === w.userId_tipo_referencia.userId && f.tipo === w.userId_tipo_referencia.tipo && f.referencia === w.userId_tipo_referencia.referencia)
  const aplicar = (f: Fila, data: any) => {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === 'object' && 'increment' in (v as any)) (f as any)[k] += (v as any).increment
      else (f as any)[k] = v
    }
    f.updatedAt = ahora()
  }
  const nueva = (data: any): Fila => {
    if (filas.some(f => f.userId === data.userId && f.tipo === data.tipo && f.referencia === data.referencia)) throw Object.assign(new Error('Unique constraint'), { code: 'P2002' })
    const t = ahora()
    const f: Fila = { id: `log${++n}`, detalle: null, intentos: 0, createdAt: t, updatedAt: t, ...data }
    filas.push(f)
    return f
  }
  const emailLog = {
    create: async ({ data }: any) => { await ceder(); return { ...nueva(data) } },
    findUnique: async ({ where }: any) => { await ceder(); const f = porClave(where); return f ? { ...f } : null },
    updateMany: async ({ where, data }: any) => {
      await ceder()
      const f = filas.find(x => x.id === where.id && x.estado === where.estado && x.updatedAt.getTime() === where.updatedAt.getTime())
      if (!f) return { count: 0 }
      aplicar(f, data); return { count: 1 }
    },
    update: async ({ where, data }: any) => { await ceder(); const f = filas.find(x => x.id === where.id); if (!f) throw new Error('not found'); aplicar(f, data); return { ...f } },
    upsert: async ({ where, create, update }: any) => { await ceder(); const f = porClave(where); if (f) { aplicar(f, update); return { ...f } } return { ...nueva(create) } },
  }
  return { filas, emailLog, envejecer: (ms: number) => filas.forEach(f => { f.updatedAt = new Date(f.updatedAt.getTime() - ms) }) }
}
