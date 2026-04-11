import { prisma } from '../../config/prisma'
import { NotFoundError, AppError, ForbiddenError } from '../../common/errors'
import { CreateDisputeInput, ResolveDisputeInput } from './dispute.schemas'
import { notify } from '../../common/utils/notify'

export class DisputeService {
  async create(data: CreateDisputeInput, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: data.matchId },
    })
    if (!match) throw new NotFoundError('Partida não encontrada')

    if (match.player1Id !== userId && match.player2Id !== userId) {
      throw new ForbiddenError('Apenas jogadores da partida podem abrir disputa')
    }

    if (match.status !== 'COMPLETED') {
      throw new AppError('Apenas partidas concluídas podem ser contestadas')
    }

    // Marcar partida como disputada
    await prisma.match.update({
      where: { id: data.matchId },
      data: { status: 'DISPUTED' },
    })

    const dispute = await prisma.dispute.create({
      data: {
        matchId: data.matchId,
        createdById: userId,
        reason: data.reason,
        evidence: data.evidence,
      },
      include: {
        match: {
          include: {
            player1: { select: { id: true, username: true } },
            player2: { select: { id: true, username: true } },
          },
        },
        creator: { select: { username: true } },
      },
    })

    // Notificar o outro jogador
    const opponentId = match.player1Id === userId ? match.player2Id : match.player1Id
    if (opponentId) {
      notify(
        opponentId,
        'MATCH',
        'Disputa aberta',
        `Uma disputa foi aberta para a sua partida. Motivo: ${data.reason}`,
        { disputeId: dispute.id, matchId: data.matchId }
      ).catch(() => {})
    }

    return dispute
  }

  async resolve(disputeId: string, data: ResolveDisputeInput, resolverId: string) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { match: true },
    })

    if (!dispute) throw new NotFoundError('Disputa não encontrada')
    if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
      throw new AppError('Disputa já resolvida')
    }

    await prisma.$transaction(async (tx) => {
      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: data.status,
          resolution: data.resolution,
          resolvedBy: resolverId,
        },
      })

      if (data.status === 'RESOLVED' && data.winnerId) {
        await tx.match.update({
          where: { id: dispute.matchId },
          data: {
            winnerId: data.winnerId,
            status: 'COMPLETED',
          },
        })
      } else {
        await tx.match.update({
          where: { id: dispute.matchId },
          data: { status: 'COMPLETED' },
        })
      }
    })
  }

  async list(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit
    const where = status ? { status: status as any } : {}

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          match: {
            include: {
              tournament: { select: { title: true } },
              player1: { select: { username: true } },
              player2: { select: { username: true } },
            },
          },
          creator: { select: { username: true } },
          resolver: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.dispute.count({ where }),
    ])

    return { disputes, total, page, limit }
  }
}
