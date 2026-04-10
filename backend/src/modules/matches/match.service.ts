import { prisma } from '../../config/prisma'
import { NotFoundError, AppError, ForbiddenError } from '../../common/errors'
import { SubmitResultInput } from './match.schemas'
import { calculateElo } from '../../common/utils'

export class MatchService {
  async getById(matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true, title: true, game: true, format: true } },
        player1: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true } },
        player2: { select: { id: true, username: true, displayName: true, avatarUrl: true, eloRating: true } },
        winner: { select: { id: true, username: true } },
        disputes: { select: { id: true, status: true, reason: true, createdAt: true } },
      },
    })

    if (!match) throw new NotFoundError('Partida não encontrada')
    return match
  }

  async getByTournament(tournamentId: string) {
    return prisma.match.findMany({
      where: { tournamentId },
      include: {
        player1: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        player2: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        winner: { select: { id: true, username: true } },
      },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    })
  }

  async submitResult(matchId: string, data: SubmitResultInput, userId: string, userRole: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true, title: true, format: true, prizePool: true } },
        player1: { select: { id: true, eloRating: true } },
        player2: { select: { id: true, eloRating: true } },
      },
    })

    if (!match) throw new NotFoundError('Partida não encontrada')

    if (match.status === 'COMPLETED') {
      throw new AppError('Partida já finalizada')
    }

    // Apenas jogadores envolvidos ou admin podem reportar
    const isPlayer = match.player1Id === userId || match.player2Id === userId
    const isAdmin = userRole === 'ADMIN' || userRole === 'MODERATOR'

    if (!isPlayer && !isAdmin) {
      throw new ForbiddenError('Sem permissão para reportar resultado')
    }

    // Validar que o winnerId é um dos jogadores
    if (data.winnerId !== match.player1Id && data.winnerId !== match.player2Id) {
      throw new AppError('Vencedor deve ser um dos jogadores da partida')
    }

    const loserId = data.winnerId === match.player1Id ? match.player2Id : match.player1Id

    await prisma.$transaction(async (tx) => {
      // Atualizar partida
      await tx.match.update({
        where: { id: matchId },
        data: {
          player1Score: data.player1Score,
          player2Score: data.player2Score,
          winnerId: data.winnerId,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      // Atualizar ELO em paralelo
      if (match.player1 && match.player2) {
        const scoreA = data.winnerId === match.player1Id ? 1 : 0
        const { newRatingA, newRatingB } = calculateElo(
          match.player1.eloRating,
          match.player2.eloRating,
          scoreA
        )

        await Promise.all([
          tx.user.update({
            where: { id: match.player1Id! },
            data: {
              eloRating: newRatingA,
              gamesPlayed: { increment: 1 },
              ...(data.winnerId === match.player1Id
                ? {
                    gamesWon: { increment: 1 },
                    winStreak: { increment: 1 },
                    xp: { increment: 50 },
                  }
                : {
                    winStreak: 0,
                    xp: { increment: 10 },
                  }),
            },
          }),
          tx.user.update({
            where: { id: match.player2Id! },
            data: {
              eloRating: newRatingB,
              gamesPlayed: { increment: 1 },
              ...(data.winnerId === match.player2Id
                ? {
                    gamesWon: { increment: 1 },
                    winStreak: { increment: 1 },
                    xp: { increment: 50 },
                  }
                : {
                    winStreak: 0,
                    xp: { increment: 10 },
                  }),
            },
          }),
        ])
      }

      // Atualizar bestWinStreak com raw SQL para evitar read-then-write
      if (data.winnerId) {
        await tx.$executeRawUnsafe(
          `UPDATE users SET best_win_streak = win_streak WHERE id = $1 AND win_streak > best_win_streak`,
          data.winnerId
        )
      }

      // Eliminar perdedor
      if (loserId && match.tournament.format === 'SINGLE_ELIMINATION') {
        await tx.participant.updateMany({
          where: {
            userId: loserId,
            tournamentId: match.tournamentId,
          },
          data: { isEliminated: true },
        })
      }

      // Avançar vencedor para próxima rodada (single elimination)
      if (match.tournament.format === 'SINGLE_ELIMINATION') {
        const nextRound = match.round + 1
        const nextPosition = Math.ceil(match.position / 2)

        const nextMatch = await tx.match.findFirst({
          where: {
            tournamentId: match.tournamentId,
            round: nextRound,
            position: nextPosition,
          },
        })

        if (nextMatch) {
          const isOddPosition = match.position % 2 === 1
          await tx.match.update({
            where: { id: nextMatch.id },
            data: isOddPosition
              ? { player1Id: data.winnerId }
              : { player2Id: data.winnerId },
          })
        } else {
          // Final — torneio completo
          await this.completeTournament(tx, match.tournamentId, data.winnerId)
        }
      }

      // Verificar se round robin acabou
      if (match.tournament.format === 'ROUND_ROBIN') {
        const pendingMatches = await tx.match.count({
          where: {
            tournamentId: match.tournamentId,
            status: 'PENDING',
          },
        })

        if (pendingMatches === 0) {
          // Determinar vencedor por mais vitórias
          const results = await tx.match.groupBy({
            by: ['winnerId'],
            where: {
              tournamentId: match.tournamentId,
              status: 'COMPLETED',
              winnerId: { not: null },
            },
            _count: { winnerId: true },
            orderBy: { _count: { winnerId: 'desc' } },
          })

          const topWinnerId = results[0]?.winnerId
          if (topWinnerId) {
            await this.completeTournament(tx, match.tournamentId, topWinnerId)
          }
        }
      }
    })

    return this.getById(matchId)
  }

  private async completeTournament(tx: any, tournamentId: string, winnerId: string) {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, title: true, prizePool: true },
    })

    if (!tournament) return

    const prizePool = Number(tournament.prizePool)

    // Distribuir prêmio se houver
    if (prizePool > 0) {
      const wallet = await tx.wallet.findUnique({
        where: { userId: winnerId },
        select: { id: true, balance: true },
      })
      if (wallet) {
        const balance = Number(wallet.balance)
        const newBalance = balance + prizePool

        await Promise.all([
          tx.wallet.update({
            where: { userId: winnerId },
            data: { balance: newBalance },
          }),
          tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'TOURNAMENT_PRIZE',
              amount: prizePool,
              balanceBefore: balance,
              balanceAfter: newBalance,
              status: 'COMPLETED',
              description: `Prêmio do torneio: ${tournament.title}`,
              referenceId: tournamentId,
            },
          }),
        ])
      }
    }

    // Placement + XP + status do torneio em paralelo
    await Promise.all([
      tx.participant.updateMany({
        where: { userId: winnerId, tournamentId },
        data: { placement: 1 },
      }),
      tx.user.update({
        where: { id: winnerId },
        data: { xp: { increment: 200 } },
      }),
      tx.tournament.update({
        where: { id: tournamentId },
        data: {
          status: 'COMPLETED',
          endDate: new Date(),
        },
      }),
    ])
  }

  async uploadProof(matchId: string, proofUrl: string, userId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, player1Id: true, player2Id: true },
    })

    if (!match) throw new NotFoundError('Partida não encontrada')

    if (match.player1Id !== userId && match.player2Id !== userId) {
      throw new ForbiddenError('Apenas jogadores da partida podem enviar provas')
    }

    return prisma.match.update({
      where: { id: matchId },
      data: { proofUrl },
    })
  }
}
