import { FastifyInstance } from 'fastify'
import { AchievementController } from './achievement.controller'
import { authMiddleware } from '../../common/middlewares'

const controller = new AchievementController()

export async function achievementRoutes(app: FastifyInstance) {
  app.get('/', controller.getAll)
  app.get('/me', { preHandler: authMiddleware }, controller.getMyAchievements)
  app.get('/user/:userId', controller.getUserAchievements)
}
