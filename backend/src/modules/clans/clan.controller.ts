import { FastifyReply, FastifyRequest } from 'fastify'
import { ClanService } from './clan.service'
import { createClanSchema, inviteMemberSchema, updateClanSchema, updateCoLeaderSchema } from './clan.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const clanService = new ClanService()

export class ClanController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createClanSchema.parse(request.body)
    const result = await clanService.create(data, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await clanService.getById(id)
    return sendSuccess(reply, result)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await clanService.list(Number(page) || 1, Number(limit) || 20)
    return sendPaginated(reply, result.clans, result.total, result.page, result.limit)
  }

  async addMember(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { username } = inviteMemberSchema.parse(request.body)
    const result = await clanService.addMember(id, username, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const { id, memberId } = request.params as { id: string; memberId: string }
    await clanService.removeMember(id, memberId, request.userId)
    return sendSuccess(reply, { message: 'Membro removido' })
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = updateClanSchema.parse(request.body)
    const result = await clanService.update(id, data, request.userId)
    return sendSuccess(reply, result)
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await clanService.delete(id, request.userId)
    return sendSuccess(reply, { message: 'Clã deletado' })
  }

  async setCoLeader(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { userId } = updateCoLeaderSchema.parse(request.body)
    await clanService.setCoLeader(id, userId, request.userId)
    return sendSuccess(reply, { message: 'Colíder definido com sucesso' })
  }

  async removeCoLeader(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await clanService.removeCoLeader(id, request.userId)
    return sendSuccess(reply, { message: 'Colíder removido com sucesso' })
  }

  async getChatMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { page, limit } = request.query as { page?: number; limit?: number }
    const result = await clanService.getClanChat(id, Number(page) || 1, Number(limit) || 50)
    return sendPaginated(reply, result.messages, result.total, result.page, result.limit)
  }

  async sendMessage(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { content } = request.body as { content: string }

    if (!content || content.trim().length === 0) {
      return sendSuccess(reply, { error: 'Mensagem vazia' }, 400)
    }

    const result = await clanService.sendClanMessage(id, request.userId, content.trim())
    return sendSuccess(reply, result, 201)
  }

  async transferOwnership(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { newOwnerId } = request.body as { newOwnerId: string }
    await clanService.transferOwnership(id, newOwnerId, request.userId)
    return sendSuccess(reply, { message: 'Liderança transferida' })
  }
}
