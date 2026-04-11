import { prisma } from '../../config/prisma'
import { notify } from '../../common/utils/notify'

// Achievement definitions — kept in code for fast checking, seeded to DB on first run
const ACHIEVEMENTS = [
  { code: 'FIRST_WIN', name: 'Primeira Vitória', description: 'Vença sua primeira partida', xpReward: 50, condition: { type: 'wins', value: 1 } },
  { code: 'WIN_10', name: 'Veterano', description: 'Vença 10 partidas', xpReward: 100, condition: { type: 'wins', value: 10 } },
  { code: 'WIN_50', name: 'Guerreiro', description: 'Vença 50 partidas', xpReward: 250, condition: { type: 'wins', value: 50 } },
  { code: 'WIN_100', name: 'Lenda', description: 'Vença 100 partidas', xpReward: 500, condition: { type: 'wins', value: 100 } },
  { code: 'STREAK_3', name: 'Em Chamas', description: 'Consiga 3 vitórias seguidas', xpReward: 75, condition: { type: 'streak', value: 3 } },
  { code: 'STREAK_5', name: 'Imparável', description: 'Consiga 5 vitórias seguidas', xpReward: 150, condition: { type: 'streak', value: 5 } },
  { code: 'STREAK_10', name: 'Invencível', description: 'Consiga 10 vitórias seguidas', xpReward: 300, condition: { type: 'streak', value: 10 } },
  { code: 'TOURNAMENT_WIN', name: 'Campeão', description: 'Vença um torneio', xpReward: 200, condition: { type: 'tournament_wins', value: 1 } },
  { code: 'TOURNAMENT_5', name: 'Pentacampeão', description: 'Vença 5 torneios', xpReward: 500, condition: { type: 'tournament_wins', value: 5 } },
  { code: 'GAMES_10', name: 'Iniciante', description: 'Jogue 10 partidas', xpReward: 30, condition: { type: 'games', value: 10 } },
  { code: 'GAMES_50', name: 'Competidor', description: 'Jogue 50 partidas', xpReward: 100, condition: { type: 'games', value: 50 } },
  { code: 'ELO_1500', name: 'Habilidoso', description: 'Alcance 1500 de ELO', xpReward: 150, condition: { type: 'elo', value: 1500 } },
  { code: 'ELO_2000', name: 'Mestre', description: 'Alcance 2000 de ELO', xpReward: 300, condition: { type: 'elo', value: 2000 } },
]

export class AchievementService {
  async seedAchievements() {
    for (const a of ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { code: a.code },
        update: {},
        create: a,
      })
    }
  }

  async getAll() {
    return prisma.achievement.findMany({ orderBy: { name: 'asc' } })
  }

  async getUserAchievements(userId: string) {
    return prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    })
  }

  /**
   * Check and award applicable achievements for a user.
   * Call after match result, tournament completion, etc.
   */
  async checkAndAward(userId: string) {
    const [user, existing] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, gamesWon: true, gamesPlayed: true,
          winStreak: true, bestWinStreak: true, eloRating: true,
        },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      }),
    ])

    if (!user) return

    const existingIds = new Set(existing.map((e) => e.achievementId))

    // Count tournament wins
    const tournamentWins = await prisma.participant.count({
      where: { userId, placement: 1 },
    })

    const achievements = await prisma.achievement.findMany()
    const newlyUnlocked: string[] = []

    for (const a of achievements) {
      if (existingIds.has(a.id)) continue

      const cond = a.condition as { type: string; value: number }
      let met = false

      switch (cond.type) {
        case 'wins':
          met = user.gamesWon >= cond.value
          break
        case 'streak':
          met = (user.bestWinStreak ?? user.winStreak) >= cond.value
          break
        case 'games':
          met = user.gamesPlayed >= cond.value
          break
        case 'elo':
          met = user.eloRating >= cond.value
          break
        case 'tournament_wins':
          met = tournamentWins >= cond.value
          break
      }

      if (met) {
        await prisma.$transaction([
          prisma.userAchievement.create({
            data: { userId, achievementId: a.id },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { xp: { increment: a.xpReward } },
          }),
        ])
        newlyUnlocked.push(a.id)

        notify(
          userId,
          'ACHIEVEMENT',
          'Conquista desbloqueada!',
          `${a.name}: ${a.description}`,
          { achievementId: a.id, code: a.code, xpReward: a.xpReward }
        ).catch(() => {})
      }
    }

    return newlyUnlocked
  }
}
