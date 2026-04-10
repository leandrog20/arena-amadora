import { buildApp } from './app'
import { env } from './config/env'
import { setupSocketServer } from './socket/socket-server'

async function start() {
  const app = await buildApp()

  const server = app.server
  setupSocketServer(server)

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`🚀 Servidor rodando em http://${env.HOST}:${env.PORT}`)
    console.log(`📡 Socket.io conectado`)
    console.log(`🌍 Ambiente: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
