import { FastifyReply, FastifyRequest } from 'fastify'
import { SocialService } from './social.service'
import { sendSuccess } from '../../common/utils'

const socialService = new SocialService()

export class SocialController {
  async sendRequest(request: FastifyRequest, reply: FastifyReply) {
    const { username } = request.body as { username: string }
    const result = await socialService.sendFriendRequest(request.userId, username)
    return sendSuccess(reply, result, 201)
  }

  async respondToRequest(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { accept } = request.body as { accept: boolean }
    const result = await socialService.respondToRequest(id, request.userId, accept)
    return sendSuccess(reply, result)
  }

  async getFriends(request: FastifyRequest, reply: FastifyReply) {
    const result = await socialService.getFriends(request.userId)
    return sendSuccess(reply, result)
  }

  async getPendingRequests(request: FastifyRequest, reply: FastifyReply) {
    const result = await socialService.getPendingRequests(request.userId)
    return sendSuccess(reply, result)
  }

  async removeFriend(request: FastifyRequest, reply: FastifyReply) {
    const { friendId } = request.params as { friendId: string }
    await socialService.removeFriend(request.userId, friendId)
    return sendSuccess(reply, { message: 'Amizade removida' })
  }

  async blockUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId: targetId } = request.params as { userId: string }
    await socialService.blockUser(request.userId, targetId)
    return sendSuccess(reply, { message: 'Usuário bloqueado' })
  }

  async unblockUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId: targetId } = request.params as { userId: string }
    await socialService.unblockUser(request.userId, targetId)
    return sendSuccess(reply, { message: 'Usuário desbloqueado' })
  }

  async getBlockedUsers(request: FastifyRequest, reply: FastifyReply) {
    const result = await socialService.getBlockedUsers(request.userId)
    return sendSuccess(reply, result)
  }
}
