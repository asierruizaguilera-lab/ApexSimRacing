const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Mapa de usuarios conectados: socketId -> { userId, username, canal }
const usuariosConectados = new Map()

app.prepare().then(() => {
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

  httpServer.listen(port, hostname, () => {
    console.log(`\n🏁 APEX SimRacing Platform`)
    console.log(`   ✅ Servidor: http://localhost:${port}`)
    console.log(`   ✅ Socket.io: activo`)
    console.log(`   ✅ Modo: ${dev ? 'desarrollo' : 'producción'}\n`)
  })
})
