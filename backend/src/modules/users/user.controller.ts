import { FastifyReply, FastifyRequest } from 'fastify'
import { UserService } from './user.service'
import { updateProfileSchema, changePasswordSchema, listUsersSchema } from './user.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const userService = new UserService()

export class UserController {
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const result = await userService.getProfile(request.userId)
    return sendSuccess(reply, result)
  }

  async getPublicProfile(request: FastifyRequest, reply: FastifyReply) {
    const { username } = request.params as { username: string }
    const result = await userService.getPublicProfile(username)
    return sendSuccess(reply, result)
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const data = updateProfileSchema.parse(request.body)
    const result = await userService.updateProfile(request.userId, data)
    return sendSuccess(reply, result)
  }

  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const data = changePasswordSchema.parse(request.body)
    await userService.changePassword(request.userId, data)
    return sendSuccess(reply, { message: 'Senha alterada com sucesso' })
  }

  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const params = listUsersSchema.parse(request.query)
    const { users, total, page, limit } = await userService.listUsers(params)
    return sendPaginated(reply, users, total, page, limit)
  }

  async getMatchHistory(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await userService.getMatchHistory(
      request.userId,
      Number(page) || 1,
      Number(limit) || 20
    )
    return sendPaginated(reply, result.matches, result.total, result.page, result.limit)
  }

  async getUserStats(request: FastifyRequest, reply: FastifyReply) {
    const result = await userService.getUserStats(request.userId)
    return sendSuccess(reply, result)
  }
}
