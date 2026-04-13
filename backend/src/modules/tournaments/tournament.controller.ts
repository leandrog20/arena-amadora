import { FastifyReply, FastifyRequest } from 'fastify'
import { TournamentService } from './tournament.service'
import { prisma } from '../../config/prisma'
import {
  createTournamentSchema,
  updateTournamentSchema,
  listTournamentsSchema,
} from './tournament.schemas'
import { sendSuccess, sendPaginated } from '../../common/utils'

const tournamentService = new TournamentService()

export class TournamentController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createTournamentSchema.parse(request.body)
    const result = await tournamentService.create(data, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const data = updateTournamentSchema.parse(request.body)
    const result = await tournamentService.update(id, data, request.userId, request.userRole)
    return sendSuccess(reply, result)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    // userId é opcional (rota pública), usado apenas para checar isParticipant
    const userId = (request as any).userId as string | undefined
    const result = await tournamentService.getById(id, userId)
    return sendSuccess(reply, result)
  }

  async getParticipants(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await tournamentService.getParticipants(id)
    return sendSuccess(reply, result)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const params = listTournamentsSchema.parse(request.query)
    const { tournaments, total, page, limit } = await tournamentService.list(params)
    return sendPaginated(reply, tournaments, total, page, limit)
  }

  async join(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await tournamentService.join(id, request.userId)
    return sendSuccess(reply, result, 201)
  }

  async leave(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    await tournamentService.leave(id, request.userId)
    return sendSuccess(reply, { message: 'Saiu do torneio com sucesso' })
  }

  async start(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const result = await tournamentService.startTournament(id, request.userId, request.userRole)
    return sendSuccess(reply, result)
  }

  async getChatMessages(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string }
    const { cursor, limit } = request.query as { cursor?: string; limit?: number }
    const take = Math.min(Number(limit) || 50, 100)

    // Verificar se o usuário é participante do torneio
    const participant = await prisma.participant.findFirst({
      where: { tournamentId: id, userId: request.userId },
    })
    if (!participant) {
      return reply.status(403).send({ success: false, message: 'Você não é participante deste torneio' })
    }

    const where: Record<string, unknown> = { tournamentId: id }
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) }
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    })

    return sendSuccess(reply, {
      messages: messages.reverse(),
      nextCursor: messages.length === take ? messages[0]?.createdAt?.toISOString() : null,
    })
  }
}
