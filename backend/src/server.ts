import { buildApp } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'
import { setupSocketServer } from './socket/socket-server'
import { AchievementService } from './modules/achievements/achievement.service'

async function start() {
  const app = await buildApp()

  // Aquece Prisma — conecta e prepara o connection pool antes de receber requests
  await prisma.$connect()
  await prisma.user.findFirst({ select: { id: true } })
  console.log('✅ Prisma aquecido')

  // Seed achievements
  const achievementService = new AchievementService()
  await achievementService.seedAchievements()
  console.log('✅ Conquistas sincronizadas')

  // Aquece Fastify — compila schemas e carrega plugins
  await app.ready()
  await app.inject({ method: 'GET', url: '/health' })
  console.log('✅ Fastify aquecido')

  const server = app.server
  setupSocketServer(server)

  try {
    await app.listen({ port: env.PORT, host: env.HOST })
    console.log(`🚀 Servidor rodando em http://${env.HOST}:${env.PORT}`)
    console.log(`📡 Socket.io conectado`)
    console.log(`🌍 Ambiente: ${env.NODE_ENV}`)

    // Keep-alive — mantém a conexão com o banco ativa (evita cold start de DBs cloud)
    setInterval(async () => {
      try {
        await prisma.$queryRawUnsafe('SELECT 1')
      } catch {}
    }, 5 * 60 * 1000)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
