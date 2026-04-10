import { FastifyInstance } from 'fastify'
import { AuthController } from './auth.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new AuthController()

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', controller.register)
  app.post('/login', controller.login)
  app.post('/refresh', controller.refresh)

  // Rotas autenticadas
  app.post('/logout', { preHandler: [authMiddleware] }, controller.logout)
  app.get('/me', { preHandler: [authMiddleware] }, controller.me)
}
