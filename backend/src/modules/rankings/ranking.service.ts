import { prisma } from '../../config/prisma'
import { cached } from '../../config/redis'

export class RankingService {
  async getGlobalRanking(page = 1, limit = 50) {
    return cached(`ranking:global:${page}:${limit}`, 30, async () => {
      const skip = (page - 1) * limit

      const [players, total] = await Promise.all([
        prisma.user.findMany({
          where: { isBanned: false, gamesPlayed: { gt: 0 } },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            eloRating: true,
            level: true,
            gamesPlayed: true,
            gamesWon: true,
            bestWinStreak: true,
          },
          orderBy: { eloRating: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({
          where: { isBanned: false, gamesPlayed: { gt: 0 } },
        }),
      ])

      const ranked = players.map((p, i) => ({
        rank: skip + i + 1,
        ...p,
        winRate: p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0,
      }))

      return { players: ranked, total, page, limit }
    })
  }

  async getGameRanking(game: string, page = 1, limit = 50) {
    return cached(`ranking:game:${game}:${page}:${limit}`, 30, async () => {
      const skip = (page - 1) * limit

      // Query única com subquery — evita N+1
      const [players, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            isBanned: false,
            participations: {
              some: { tournament: { game } },
            },
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            eloRating: true,
            level: true,
            gamesPlayed: true,
            gamesWon: true,
          },
          orderBy: { eloRating: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({
          where: {
            isBanned: false,
            participations: {
              some: { tournament: { game } },
            },
          },
        }),
      ])

      const ranked = players.map((p, i) => ({
        rank: skip + i + 1,
        ...p,
      }))

      return { players: ranked, total, page, limit }
    })
  }

  async getTeamRanking(page = 1, limit = 50) {
    return cached(`ranking:teams:${page}:${limit}`, 30, async () => {
      const skip = (page - 1) * limit

      const [teams, total] = await Promise.all([
        prisma.team.findMany({
          include: { _count: { select: { members: true } } },
          orderBy: { eloRating: 'desc' },
          skip,
          take: limit,
        }),
        prisma.team.count(),
      ])

      const ranked = teams.map((t, i) => ({
        rank: skip + i + 1,
        ...t,
      }))

      return { teams: ranked, total, page, limit }
    })
  }
}
