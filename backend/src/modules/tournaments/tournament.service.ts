import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { cached } from '../../config/redis'
import {
  NotFoundError,
  ConflictError,
  AppError,
  ForbiddenError,
  InsufficientFundsError,
} from '../../common/errors'
import {
  CreateTournamentInput,
  UpdateTournamentInput,
  ListTournamentsInput,
} from './tournament.schemas'

export class TournamentService {
  async create(data: CreateTournamentInput, createdById: string) {
    const feePercentage = env.PLATFORM_FEE_PERCENTAGE

    const tournament = await prisma.tournament.create({
      data: {
        title: data.title,
        description: data.description,
        game: data.game,
        format: data.format,
        maxParticipants: data.maxParticipants,
        minParticipants: data.minParticipants,
        entryFee: data.entryFee,
        rules: data.rules,
        isTeamBased: data.isTeamBased,
        teamSize: data.teamSize,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null,
        feePercentage,
        status: 'REGISTRATION',
        createdById,
      },
    })

    return tournament
  }

  async update(id: string, data: UpdateTournamentInput, userId: string, userRole: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, createdById: true, status: true },
    })
    if (!tournament) throw new NotFoundError('Torneio não encontrado')

    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('Sem permissão para editar este torneio')
    }

    if (tournament.status === 'IN_PROGRESS' || tournament.status === 'COMPLETED') {
      throw new AppError('Não é possível editar um torneio em andamento ou concluído')
    }

    const updateData: Record<string, unknown> = {}
    if (data.title) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.game) updateData.game = data.game
    if (data.format) updateData.format = data.format
    if (data.maxParticipants) updateData.maxParticipants = data.maxParticipants
    if (data.minParticipants) updateData.minParticipants = data.minParticipants
    if (data.entryFee !== undefined) updateData.entryFee = data.entryFee
    if (data.rules !== undefined) updateData.rules = data.rules
    if (data.startDate) updateData.startDate = new Date(data.startDate)
    if (data.endDate) updateData.endDate = new Date(data.endDate)
    if (data.registrationEnd) updateData.registrationEnd = new Date(data.registrationEnd)

    return prisma.tournament.update({
      where: { id },
      data: updateData,
    })
  }

  async getById(id: string, userId?: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { participants: true, matches: true } },
      },
    })

    if (!tournament) throw new NotFoundError('Torneio não encontrado')

    // Check rápido se o usuário está inscrito (1 query simples por PK)
    let isParticipant = false
    if (userId) {
      const participant = await prisma.participant.findUnique({
        where: { userId_tournamentId: { userId, tournamentId: id } },
        select: { id: true },
      })
      isParticipant = !!participant
    }

    return { ...tournament, isParticipant }
  }

  async getParticipants(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    })
    if (!tournament) throw new NotFoundError('Torneio não encontrado')

    return prisma.participant.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true },
        },
      },
      orderBy: { seed: 'asc' },
    })
  }

  async list(params: ListTournamentsInput) {
    const { page, limit, status, game, search, sortBy, order } = params

    // Torneios COMPLETED/CANCELLED mudam raramente — cache longo (5min)
    // Listagens ativas: cache curto (15s) para não mostrar dados muito stale
    const ttl = (status === 'COMPLETED' || status === 'CANCELLED') ? 300 : 15
    const cacheKey = `tournaments:list:${page}:${limit}:${status || ''}:${game || ''}:${search || ''}:${sortBy}:${order}`

    return cached(cacheKey, ttl, async () => {
      const skip = (page - 1) * limit

      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (game) where.game = game
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ]
      }

      const [tournaments, total] = await Promise.all([
        prisma.tournament.findMany({
          where,
          include: {
            createdBy: {
              select: { username: true, displayName: true },
            },
            _count: { select: { participants: true } },
          },
          orderBy: { [sortBy]: order },
          skip,
          take: limit,
        }),
        prisma.tournament.count({ where }),
      ])

      return { tournaments, total, page, limit }
    })
  }

  async join(tournamentId: string, userId: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    })

    if (!tournament) throw new NotFoundError('Torneio não encontrado')
    if (tournament.status !== 'REGISTRATION') {
      throw new AppError('Torneio não está em fase de inscrição')
    }

    if (tournament.registrationEnd && new Date() > tournament.registrationEnd) {
      throw new AppError('Período de inscrição encerrado')
    }

    if (tournament._count.participants >= tournament.maxParticipants) {
      throw new AppError('Torneio lotado')
    }

    const existing = await prisma.participant.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    })
    if (existing) throw new ConflictError('Você já está inscrito neste torneio')

    const entryFee = Number(tournament.entryFee)

    // Transação atômica para cobrar entrada e inscrever
    const result = await prisma.$transaction(async (tx) => {
      if (entryFee > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } })
        if (!wallet) throw new NotFoundError('Carteira não encontrada')

        const balance = Number(wallet.balance)
        if (balance < entryFee) {
          throw new InsufficientFundsError()
        }

        const newBalance = balance - entryFee
        await tx.wallet.update({
          where: { userId },
          data: { balance: newBalance },
        })

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'TOURNAMENT_ENTRY',
            amount: -entryFee,
            balanceBefore: balance,
            balanceAfter: newBalance,
            status: 'COMPLETED',
            description: `Inscrição no torneio: ${tournament.title}`,
            referenceId: tournamentId,
          },
        })

        // Atualizar prize pool
        const platformCut = entryFee * (Number(tournament.feePercentage) / 100)
        const prizeAmount = entryFee - platformCut

        await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            prizePool: { increment: prizeAmount },
            platformFee: { increment: platformCut },
          },
        })
      }

      const participant = await tx.participant.create({
        data: {
          userId,
          tournamentId,
          seed: tournament._count.participants + 1,
        },
      })

      return participant
    })

    return result
  }

  async leave(tournamentId: string, userId: string) {
    const [tournament, participant] = await Promise.all([
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { id: true, title: true, status: true, entryFee: true, feePercentage: true },
      }),
      prisma.participant.findUnique({
        where: { userId_tournamentId: { userId, tournamentId } },
      }),
    ])

    if (!tournament) throw new NotFoundError('Torneio não encontrado')

    if (tournament.status !== 'REGISTRATION') {
      throw new AppError('Não é possível sair de um torneio em andamento')
    }

    if (!participant) throw new NotFoundError('Você não está inscrito neste torneio')

    const entryFee = Number(tournament.entryFee)

    await prisma.$transaction(async (tx) => {
      // Reembolsar taxa de entrada
      if (entryFee > 0) {
        const wallet = await tx.wallet.findUnique({ where: { userId } })
        if (wallet) {
          const balance = Number(wallet.balance)
          const newBalance = balance + entryFee

          await tx.wallet.update({
            where: { userId },
            data: { balance: newBalance },
          })

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'REFUND',
              amount: entryFee,
              balanceBefore: balance,
              balanceAfter: newBalance,
              status: 'COMPLETED',
              description: `Reembolso: saída do torneio ${tournament.title}`,
              referenceId: tournamentId,
            },
          })

          // Reajustar prize pool
          const platformCut = entryFee * (Number(tournament.feePercentage) / 100)
          const prizeAmount = entryFee - platformCut

          await tx.tournament.update({
            where: { id: tournamentId },
            data: {
              prizePool: { decrement: prizeAmount },
              platformFee: { decrement: platformCut },
            },
          })
        }
      }

      await tx.participant.delete({
        where: { userId_tournamentId: { userId, tournamentId } },
      })
    })
  }

  async startTournament(tournamentId: string, userId: string, userRole: string) {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, eloRating: true } },
          },
        },
      },
    })

    if (!tournament) throw new NotFoundError('Torneio não encontrado')

    if (tournament.createdById !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenError('Sem permissão')
    }

    if (tournament.status !== 'REGISTRATION') {
      throw new AppError('Torneio não está em fase de inscrição')
    }

    if (tournament.participants.length < tournament.minParticipants) {
      throw new AppError(`Mínimo de ${tournament.minParticipants} participantes necessários`)
    }

    // Seed baseado em ELO (matchmaking)
    const sortedParticipants = tournament.participants.sort(
      (a, b) => b.user.eloRating - a.user.eloRating
    )

    // Gerar brackets
    const matches = this.generateBracket(
      tournament.format,
      sortedParticipants.map((p) => p.userId),
      tournamentId
    )

    const totalRounds = matches.length > 0
      ? Math.max(...matches.map((m) => m.round))
      : 0

    await prisma.$transaction(async (tx) => {
      // Atualizar todos os seeds em uma única query SQL (elimina N+1)
      if (sortedParticipants.length > 0) {
        const cases = sortedParticipants.map(
          (p, i) => Prisma.sql`WHEN id = ${p.id} THEN ${i + 1}`
        )
        const ids = sortedParticipants.map((p) => p.id)
        await tx.$executeRaw`
          UPDATE "participants"
          SET seed = CASE ${Prisma.join(cases, ' ')} END
          WHERE id IN (${Prisma.join(ids)})
        `
      }

      // Criar partidas + atualizar torneio em paralelo
      await Promise.all([
        tx.match.createMany({ data: matches }),
        tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'IN_PROGRESS',
            currentRound: 1,
            totalRounds,
          },
        }),
      ])
    })

    return { id: tournamentId, status: 'IN_PROGRESS' as const, totalRounds }
  }

  private generateBracket(
    format: string,
    playerIds: string[],
    tournamentId: string
  ) {
    if (format === 'SINGLE_ELIMINATION') {
      return this.generateSingleElimination(playerIds, tournamentId)
    }
    if (format === 'ROUND_ROBIN') {
      return this.generateRoundRobin(playerIds, tournamentId)
    }
    // Double elimination usa single como base
    return this.generateSingleElimination(playerIds, tournamentId)
  }

  private generateSingleElimination(playerIds: string[], tournamentId: string) {
    const n = playerIds.length
    // Próxima potência de 2
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)))
    const totalRounds = Math.log2(bracketSize)
    const matches: {
      tournamentId: string
      round: number
      position: number
      player1Id: string | null
      player2Id: string | null
      status: 'PENDING' | 'COMPLETED'
    }[] = []

    // Primeira rodada
    let position = 0
    for (let i = 0; i < bracketSize; i += 2) {
      position++
      const p1 = playerIds[i] || null
      const p2 = playerIds[i + 1] || null

      matches.push({
        tournamentId,
        round: 1,
        position,
        player1Id: p1,
        player2Id: p2,
        status: !p1 || !p2 ? 'COMPLETED' : 'PENDING',
      })
    }

    // Rodadas seguintes (vazias)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = bracketSize / Math.pow(2, round)
      for (let pos = 1; pos <= matchesInRound; pos++) {
        matches.push({
          tournamentId,
          round,
          position: pos,
          player1Id: null,
          player2Id: null,
          status: 'PENDING',
        })
      }
    }

    return matches
  }

  private generateRoundRobin(playerIds: string[], tournamentId: string) {
    const matches: {
      tournamentId: string
      round: number
      position: number
      player1Id: string | null
      player2Id: string | null
      status: 'PENDING'
    }[] = []

    const n = playerIds.length
    const rounds = n % 2 === 0 ? n - 1 : n
    let position = 0

    // Gerar todas as combinações
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        position++
        const round = Math.floor(position / Math.ceil(n / 2)) + 1
        matches.push({
          tournamentId,
          round,
          position: position % Math.ceil(n / 2) || Math.ceil(n / 2),
          player1Id: playerIds[i],
          player2Id: playerIds[j],
          status: 'PENDING',
        })
      }
    }

    return matches
  }
}
