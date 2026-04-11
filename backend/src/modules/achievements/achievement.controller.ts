import { FastifyReply, FastifyRequest } from 'fastify'
import { AchievementService } from './achievement.service'
import { sendSuccess } from '../../common/utils'

const achievementService = new AchievementService()

export class AchievementController {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    const achievements = await achievementService.getAll()
    return sendSuccess(reply, achievements)
  }

  async getUserAchievements(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.params as { userId: string }
    const achievements = await achievementService.getUserAchievements(userId)
    return sendSuccess(reply, achievements)
  }

  async getMyAchievements(request: FastifyRequest, reply: FastifyReply) {
    const achievements = await achievementService.getUserAchievements(request.userId)
    return sendSuccess(reply, achievements)
  }
}
