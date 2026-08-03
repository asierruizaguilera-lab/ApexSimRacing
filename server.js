const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const cron = require('node-cron')
const { execSync } = require('child_process')

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

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Mapa de usuarios conectados: socketId -> { userId, username, canal }
const usuariosConectados = new Map()

runSeedOnStartIfRequested().then(() => app.prepare()).then(() => {
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

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`)

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

    // Nuevo mensaje de chat
    socket.on('chat:message', (mensaje) => {
      const userData = usuariosConectados.get(socket.id)
      if (!userData) return

      // Emitir al canal correspondiente
      io.to(mensaje.canal || 'GENERAL').emit('chat:message', {
        ...mensaje,
        socketId: socket.id,
      })
    })

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

  httpServer.listen(port, hostname, () => {
    console.log(`\n🏁 APEX SimRacing Platform`)
    console.log(`   ✅ Servidor: http://localhost:${port}`)
    console.log(`   ✅ Socket.io: activo`)
    console.log(`   ✅ Modo: ${dev ? 'desarrollo' : 'producción'}\n`)
    console.log(`   🔄 Sync Sheet: lunes 6:00 AM (Europe/Madrid)\n`)
  })
})
