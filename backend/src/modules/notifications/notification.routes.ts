import { FastifyInstance } from 'fastify'
import { NotificationController } from './notification.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new NotificationController()

export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware)

  app.get('/', controller.getAll)
  app.patch('/:id/read', controller.markAsRead)
  app.post('/read-all', controller.markAllAsRead)
}
