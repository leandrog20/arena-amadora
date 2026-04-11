import { prisma } from '../../config/prisma'
import { NotFoundError, AppError, ForbiddenError } from '../../common/errors'
import { SubmitResultInput } from './match.schemas'
import { calculateElo } from '../../common/utils'
import { invalidateCache } from '../../config/redis'
import { notify, notifyMany } from '../../common/utils/notify'
import { emitMatchUpdate } from '../../socket/socket-server'
import { AchievementService } from '../achievements/achievement.service'

const achievementService = new AchievementService()

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

      // Double elimination — avançar vencedor + enviar perdedor para losers bracket
      if (match.tournament.format === 'DOUBLE_ELIMINATION') {
        const matchMeta = (match as any).metadata as { bracket?: string } | null
        const bracket = matchMeta?.bracket || 'winners'

        if (bracket === 'winners') {
          // Vencedor avança no winners bracket
          const nextRound = match.round + 1
          const nextPosition = Math.ceil(match.position / 2)
          const nextWinners = await tx.match.findFirst({
            where: {
              tournamentId: match.tournamentId,
              round: nextRound,
              metadata: { path: ['bracket'], equals: 'winners' },
            },
          })
          if (nextWinners) {
            const isOdd = match.position % 2 === 1
            await tx.match.update({
              where: { id: nextWinners.id },
              data: isOdd ? { player1Id: data.winnerId } : { player2Id: data.winnerId },
            })
          }

          // Perdedor vai para losers bracket
          if (loserId) {
            const losersMatch = await tx.match.findFirst({
              where: {
                tournamentId: match.tournamentId,
                metadata: { path: ['bracket'], equals: 'losers' },
                OR: [{ player1Id: null }, { player2Id: null }],
              },
              orderBy: { round: 'asc' },
            })
            if (losersMatch) {
              await tx.match.update({
                where: { id: losersMatch.id },
                data: !losersMatch.player1Id
                  ? { player1Id: loserId }
                  : { player2Id: loserId },
              })
            }
          }
        } else if (bracket === 'losers') {
          // Perdedor no losers bracket = eliminado
          if (loserId) {
            await tx.participant.updateMany({
              where: { userId: loserId, tournamentId: match.tournamentId },
              data: { isEliminated: true },
            })
          }

          // Vencedor avança no losers bracket
          const nextLosers = await tx.match.findFirst({
            where: {
              tournamentId: match.tournamentId,
              round: { gt: match.round },
              metadata: { path: ['bracket'], equals: 'losers' },
              OR: [{ player1Id: null }, { player2Id: null }],
            },
            orderBy: { round: 'asc' },
          })
          if (nextLosers) {
            await tx.match.update({
              where: { id: nextLosers.id },
              data: !nextLosers.player1Id
                ? { player1Id: data.winnerId }
                : { player2Id: data.winnerId },
            })
          } else {
            // Sem mais losers rounds — vai para grand final
            const grandFinal = await tx.match.findFirst({
              where: {
                tournamentId: match.tournamentId,
                metadata: { path: ['bracket'], equals: 'grand_final' },
              },
            })
            if (grandFinal) {
              await tx.match.update({
                where: { id: grandFinal.id },
                data: { player2Id: data.winnerId },
              })
            }
          }
        } else if (bracket === 'grand_final') {
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

    // Invalidar caches afetados (fire-and-forget)
    invalidateCache('ranking:*')
    invalidateCache('tournaments:*')

    // Notificar jogadores do resultado
    const winnerName = match.player1Id === data.winnerId ? 'Jogador 1' : 'Jogador 2'
    const playerIds = [match.player1Id, match.player2Id].filter((id): id is string => !!id)
    for (const pid of playerIds) {
      const isWinner = pid === data.winnerId
      notify(
        pid,
        'MATCH',
        isWinner ? 'Vitória!' : 'Derrota',
        isWinner
          ? `Você venceu a partida no torneio ${match.tournament.title}!`
          : `Você perdeu a partida no torneio ${match.tournament.title}.`,
        { matchId, tournamentId: match.tournamentId }
      ).catch(() => {})
    }

    // Emitir atualização WebSocket da partida
    emitMatchUpdate(matchId, { matchId, winnerId: data.winnerId, status: 'COMPLETED' })

    // Verificar conquistas para ambos jogadores (fire-and-forget)
    const playerIdsForAchievements = [match.player1Id, match.player2Id].filter((id): id is string => !!id)
    for (const pid of playerIdsForAchievements) {
      achievementService.checkAndAward(pid).catch(() => {})
    }

    return this.getById(matchId)
  }

  private async completeTournament(tx: any, tournamentId: string, winnerId: string) {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, title: true, prizePool: true },
    })

    if (!tournament) return

    const prizePool = Number(tournament.prizePool)

    // Determinar 2º e 3º lugar
    const completedMatches = await tx.match.findMany({
      where: { tournamentId, status: 'COMPLETED', winnerId: { not: null } },
      orderBy: [{ round: 'desc' }, { position: 'asc' }],
      select: { player1Id: true, player2Id: true, winnerId: true, round: true },
    })

    let secondPlaceId: string | null = null
    let thirdPlaceIds: string[] = []

    if (completedMatches.length > 0) {
      // Finalista = perdedor da última partida
      const finalMatch = completedMatches[0]
      secondPlaceId = finalMatch.player1Id === winnerId ? finalMatch.player2Id : finalMatch.player1Id

      // Semi-finalistas perdedores = 3º lugar
      const semiFinalRound = finalMatch.round - 1
      if (semiFinalRound > 0) {
        const semiMatches = completedMatches.filter((m: any) => m.round === semiFinalRound)
        thirdPlaceIds = semiMatches
          .map((m: any) => m.player1Id === m.winnerId ? m.player2Id : m.player1Id)
          .filter((id: string | null): id is string => !!id && id !== winnerId && id !== secondPlaceId)
      }
    }

    // Distribuição: 60% 1º, 25% 2º, 15% 3º (dividido entre 3ºs)
    const prize1st = prizePool > 0 ? Math.floor(prizePool * 0.60) : 0
    const prize2nd = prizePool > 0 ? Math.floor(prizePool * 0.25) : 0
    const prize3rd = prizePool > 0 ? Math.floor((prizePool * 0.15) / Math.max(1, thirdPlaceIds.length)) : 0

    // Helper para pagar prêmio
    const awardPrize = async (userId: string, amount: number, placement: number) => {
      if (amount <= 0) return
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true, balance: true },
      })
      if (!wallet) return
      const balance = Number(wallet.balance)
      const newBalance = balance + amount
      await Promise.all([
        tx.wallet.update({ where: { userId }, data: { balance: newBalance } }),
        tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'TOURNAMENT_PRIZE',
            amount,
            balanceBefore: balance,
            balanceAfter: newBalance,
            status: 'COMPLETED',
            description: `${placement}º lugar - ${tournament.title}`,
            referenceId: tournamentId,
          },
        }),
      ])
    }

    // Pagar prêmios
    await awardPrize(winnerId, prize1st, 1)
    if (secondPlaceId) await awardPrize(secondPlaceId, prize2nd, 2)
    for (const thirdId of thirdPlaceIds) {
      await awardPrize(thirdId, prize3rd, 3)
    }

    // Placements + XP + status
    const placementUpdates = [
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
        data: { status: 'COMPLETED', endDate: new Date() },
      }),
    ]

    if (secondPlaceId) {
      placementUpdates.push(
        tx.participant.updateMany({
          where: { userId: secondPlaceId, tournamentId },
          data: { placement: 2 },
        }),
        tx.user.update({
          where: { id: secondPlaceId },
          data: { xp: { increment: 100 } },
        }),
      )
    }

    for (const thirdId of thirdPlaceIds) {
      placementUpdates.push(
        tx.participant.updateMany({
          where: { userId: thirdId, tournamentId },
          data: { placement: 3 },
        }),
        tx.user.update({
          where: { id: thirdId },
          data: { xp: { increment: 50 } },
        }),
      )
    }

    await Promise.all(placementUpdates)

    // Notificar vencedores do torneio
    const placements = [
      { id: winnerId, place: 1, prize: prize1st },
      ...(secondPlaceId ? [{ id: secondPlaceId, place: 2, prize: prize2nd }] : []),
      ...thirdPlaceIds.map((id) => ({ id, place: 3, prize: prize3rd })),
    ]
    for (const p of placements) {
      notify(
        p.id,
        'TOURNAMENT',
        `${p.place}º lugar!`,
        `Você ficou em ${p.place}º no torneio ${tournament.title}${p.prize > 0 ? ` e ganhou R$ ${(p.prize / 100).toFixed(2)}` : ''}!`,
        { tournamentId, placement: p.place, prize: p.prize }
      ).catch(() => {})
    }
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
