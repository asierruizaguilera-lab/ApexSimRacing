const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const cron = require('node-cron')
const { execSync, execFileSync } = require('child_process')
const { getToken } = require('next-auth/jwt')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Inicialización de BD sin acceso a Shell (Render): si RUN_SEED_ON_START=true,
// sincroniza el esquema y ejecuta el seed antes de arrancar el servidor.
// Ambos pasos son best-effort: un fallo se loguea pero nunca impide que el servidor arranque.
async function runSeedOnStartIfRequested() {
  if (process.env.RUN_SEED_ON_START !== 'true') return

  console.log('[BOOT] RUN_SEED_ON_START=true — ejecutando prisma db push y seed...')

  // El campo `simulador` (y su enum) se eliminaron del schema — APEX solo usa Assetto Corsa,
  // así que ya no aporta información y se retiró en vez de mantenerlo forzado a un solo valor.
  // Se elimina aquí ANTES de `db push` (con IF EXISTS, así que es un no-op en despliegues futuros)
  // para que `db push` no encuentre ninguna columna/tipo que "perder" y nunca necesite
  // --accept-data-loss — ese flag se mantiene deliberadamente fuera del comando de abajo.
  try {
    execSync('npx prisma db execute --stdin --schema=prisma/schema.prisma', {
      input: 'ALTER TABLE "campeonatos" DROP COLUMN IF EXISTS "simulador"; DROP TYPE IF EXISTS "Simulador";',
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    console.log('[BOOT] ✅ Columna simulador y su enum eliminados (o ya no existían)')
  } catch (err) {
    console.error('[BOOT] ❌ Error eliminando columna simulador (no crítico si la tabla aún no existe):', err.message)
  }

  // El canal de chat DRIFT se eliminó del enum CanalChat. Se borran sus mensajes y se recrea el
  // enum ANTES de `db push` por el mismo motivo (idempotente: no-op si DRIFT ya no existe).
  try {
    execFileSync(
      process.execPath,
      [require.resolve('ts-node/dist/bin.js'), '--compiler-options', '{"module":"CommonJS"}', 'scripts/migrate-canal-drift.ts'],
      { stdio: 'inherit' }
    )
  } catch (err) {
    console.error('[BOOT] ❌ Error en la migración del canal DRIFT:', err.message)
  }

  try {
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' })
    console.log('[BOOT] ✅ prisma db push completado')
  } catch (err) {
    console.error('[BOOT] ❌ Error en prisma db push:', err.message)
  }

  try {
    execSync('npx prisma db seed', { stdio: 'inherit' })
    console.log('[BOOT] ✅ prisma db seed completado')
  } catch (err) {
    console.error('[BOOT] ❌ Error en prisma db seed:', err.message)
  }
}

// Migración opcional del enum Simulador: si RUN_MIGRATION_SIMULADOR=true, pasa a ASSETTO_CORSA
// los campeonatos con otro simulador. Se ejecuta ANTES del seed (que elimina la columna) y es
// best-effort: un fallo se loguea pero no impide arrancar.
async function runMigrationSimuladorIfRequested() {
  if (process.env.RUN_MIGRATION_SIMULADOR !== 'true') return

  console.log('[BOOT] RUN_MIGRATION_SIMULADOR=true — ejecutando scripts/migrate-simulador.ts...')
  try {
    // Se invoca ts-node con un array de argumentos (sin shell) para que el JSON llegue intacto en Linux y Windows
    execFileSync(
      process.execPath,
      [require.resolve('ts-node/dist/bin.js'), '--compiler-options', '{"module":"CommonJS"}', 'scripts/migrate-simulador.ts'],
      { stdio: 'inherit' }
    )
    console.log('[BOOT] ✅ Migración simulador completada')
  } catch (err) {
    console.error('[BOOT] ❌ Error en migración simulador:', err.message)
  }
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Mapa de usuarios conectados: socketId -> { userId, username, canal }
const usuariosConectados = new Map()

// Prisma se carga tras el seed/generate del arranque (solo lo usan los handlers de socket)
let prisma = null
function getPrisma() {
  if (!prisma) {
    const { PrismaClient } = require('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()) } catch { out[k] = part.slice(i + 1).trim() }
  }
  return out
}

// Canal privado de una conversación 1 a 1: ids siempre ordenados para que ambos lados coincidan
function canalDM(a, b) {
  return `dm:${[a, b].sort().join('-')}`
}

runMigrationSimuladorIfRequested()
  .then(() => runSeedOnStartIfRequested())
  .then(() => app.prepare()).then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  // Exportar io para usarlo desde API routes via global
  global.io = io

  // Identidad del socket a partir de la cookie de sesión de NextAuth. Nunca se confía en el userId
  // que mande el cliente: las salas privadas (equipo:*, dm:*, user:*) dependen de esta identidad.
  // Los sockets sin sesión se aceptan igualmente (chat público), pero no pueden entrar en salas privadas.
  io.use(async (socket, next) => {
    try {
      socket.request.cookies = parseCookies(socket.request.headers.cookie)
      const token = await getToken({ req: socket.request, secret: process.env.NEXTAUTH_SECRET ?? process.env.SECRET })
      if (token?.id && !token.baneado) {
        socket.data.userId = token.id
        socket.data.role = token.role
      }
    } catch (err) {
      console.error('[Socket] Error leyendo la sesión:', err.message)
    }
    next()
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`)

    // Sala personal: avisos de mensajes directos nuevos (badge de la sidebar, bandeja de entrada)
    if (socket.data.userId) socket.join(`user:${socket.data.userId}`)

    // Chat de equipo: solo miembros del equipo (o admins, para moderar)
    socket.on('equipo:join', async ({ equipoId } = {}, ack) => {
      const userId = socket.data.userId
      let ok = false
      try {
        if (userId && typeof equipoId === 'string') {
          if (socket.data.role === 'ADMIN') ok = true
          else {
            const m = await getPrisma().miembroEquipo.findUnique({ where: { userId }, select: { equipoId: true } })
            ok = m?.equipoId === equipoId
          }
        }
      } catch (err) {
        console.error('[Socket] equipo:join:', err.message)
      }
      if (ok) socket.join(`equipo:${equipoId}`)
      if (typeof ack === 'function') ack({ ok })
    })

    socket.on('equipo:leave', ({ equipoId } = {}) => {
      if (typeof equipoId === 'string') socket.leave(`equipo:${equipoId}`)
    })

    // Mensajes directos: la sala se calcula con el userId autenticado, así que nadie puede
    // unirse a una conversación de la que no forma parte. El envío va por POST /api/mensajes/[userId]
    // (guarda en BD, aplica anti-spam y difunde con global.io), igual que el chat general.
    socket.on('dm:join', ({ otroUserId } = {}) => {
      const userId = socket.data.userId
      if (userId && typeof otroUserId === 'string') socket.join(canalDM(userId, otroUserId))
    })

    socket.on('dm:leave', ({ otroUserId } = {}) => {
      const userId = socket.data.userId
      if (userId && typeof otroUserId === 'string') socket.leave(canalDM(userId, otroUserId))
    })

    // Usuario se identifica al conectar
    socket.on('user:join', ({ userId, username, canal }) => {
      usuariosConectados.set(socket.id, { userId, username, canal: canal || 'GENERAL' })
      socket.join(canal || 'GENERAL')

      // Emitir lista actualizada de usuarios conectados
      const conectados = Array.from(usuariosConectados.values())
      io.emit('users:online', conectados.length)
      console.log(`[Socket] ${username} se unió a #${canal}`)
    })

    // Cambiar de canal
    socket.on('canal:join', ({ canal, prevCanal }) => {
      if (prevCanal) socket.leave(prevCanal)
      socket.join(canal)
      const userData = usuariosConectados.get(socket.id)
      if (userData) {
        usuariosConectados.set(socket.id, { ...userData, canal })
      }
    })

    // Los mensajes de chat NO se reenvían desde el cliente: /api/chat/messages los guarda,
    // aplica el anti-spam y los difunde con global.io. Así nadie puede saltarse el límite por socket.

    // Typing indicator
    socket.on('chat:typing', ({ canal, username }) => {
      socket.to(canal).emit('chat:typing', { username })
    })

    // Desconexión
    socket.on('disconnect', () => {
      const userData = usuariosConectados.get(socket.id)
      usuariosConectados.delete(socket.id)
      const conectados = Array.from(usuariosConectados.values())
      io.emit('users:online', conectados.length)
      if (userData) {
        console.log(`[Socket] ${userData.username} desconectado`)
      }
    })
  })

  // Sincronización semanal de carreras desde Google Sheets — lunes 6:00 AM hora española
  cron.schedule('0 6 * * 1', async () => {
    console.log('[CRON] Sincronizando carreras desde Google Sheets...')
    try {
      const base = process.env.NEXTAUTH_URL || `http://localhost:${port}`
      const secretQs = process.env.CRON_SECRET ? `?secret=${process.env.CRON_SECRET}` : ''
      const res = await fetch(`${base}/api/cron/sync-sheet${secretQs}`)
      const data = await res.json()
      console.log('[CRON] Resultado:', data)
    } catch (err) {
      console.error('[CRON] Error en sincronización:', err)
    }
  }, {
    timezone: 'Europe/Madrid',
  })

  // Cierre de temporada — cada día a las 23:59: si hoy es el último día de la temporada activa
  // (30 abr, 31 ago o 31 dic) fija el ganador, notifica a todos y activa la siguiente
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Comprobando fin de temporada...')
    try {
      const base = process.env.NEXTAUTH_URL || `http://localhost:${port}`
      const secretQs = process.env.CRON_SECRET ? `?secret=${process.env.CRON_SECRET}` : ''
      const res = await fetch(`${base}/api/cron/temporadas${secretQs}`)
      const data = await res.json()
      console.log('[CRON] Temporadas:', data)
    } catch (err) {
      console.error('[CRON] Error comprobando temporadas:', err)
    }
  }, {
    timezone: 'Europe/Madrid',
  })

  httpServer.listen(port, hostname, () => {
    console.log(`\n🏁 APEX SimRacing Platform`)
    console.log(`   ✅ Servidor: http://localhost:${port}`)
    console.log(`   ✅ Socket.io: activo`)
    console.log(`   ✅ Modo: ${dev ? 'desarrollo' : 'producción'}\n`)
    console.log(`   🔄 Sync Sheet: lunes 6:00 AM (Europe/Madrid)`)
    console.log(`   🏆 Cierre de temporada: diario 23:59 (Europe/Madrid)\n`)
  })
})
