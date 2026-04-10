import { FastifyInstance } from 'fastify'
import { UserController } from './user.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new UserController()

export async function userRoutes(app: FastifyInstance) {
  // Rotas públicas
  app.get('/profile/:username', controller.getPublicProfile)
  app.get('/', controller.listUsers)

  // Rotas autenticadas
  app.get('/me', { preHandler: [authMiddleware] }, controller.getProfile)
  app.patch('/me', { preHandler: [authMiddleware] }, controller.updateProfile)
  app.put('/me/password', { preHandler: [authMiddleware] }, controller.changePassword)
  app.get('/me/matches', { preHandler: [authMiddleware] }, controller.getMatchHistory)
  app.get('/me/stats', { preHandler: [authMiddleware] }, controller.getUserStats)
}
