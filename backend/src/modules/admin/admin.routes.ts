import { FastifyInstance } from 'fastify'
import { AdminController } from './admin.controller'
import { authMiddleware, requireRole } from '../../common/middlewares'

const controller = new AdminController()

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)
  app.addHook('preHandler', requireRole('ADMIN'))

  app.get('/dashboard', controller.getDashboard)
  app.get('/users', controller.listUsers)
  app.post('/users/:id/ban', controller.banUser)
  app.post('/users/:id/unban', controller.unbanUser)
  app.patch('/users/:id/role', controller.setRole)
  app.get('/logs', controller.getActionLogs)
  app.get('/stats', controller.getStats)
}
