import { prisma } from '../../config/prisma'
import { NotFoundError } from '../../common/errors'

export class AdminService {
  async getDashboard() {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalUsers,
      activeUsersToday,
      totalTournaments,
      activeTournaments,
      completedTournaments,
      cancelledTournaments,
      registrationTournaments,
      totalRevenue,
      totalTransactions,
      totalPrizeDistributed,
      totalDeposits,
      totalWithdrawals,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.tournament.count(),
      prisma.tournament.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.tournament.count({ where: { status: 'COMPLETED' } }),
      prisma.tournament.count({ where: { status: 'CANCELLED' } }),
      prisma.tournament.count({ where: { status: 'REGISTRATION' } }),
      prisma.transaction.aggregate({
        where: { type: 'PLATFORM_FEE', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.count(),
      prisma.transaction.aggregate({
        where: { type: 'TOURNAMENT_PRIZE', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          role: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    // Receita dos últimos 30 dias (agregação por dia)
    const revenueByDay: Array<{ date: Date; total: number }> = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COALESCE(SUM(amount), 0) as total
      FROM transactions
      WHERE type = 'PLATFORM_FEE' AND status = 'COMPLETED' AND created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Novos usuários por dia (últimos 30 dias)
    const usersByDay: Array<{ date: Date; count: bigint }> = await prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Jogos mais populares (por quantidade de torneios)
    const gamesByTournaments: Array<{ game: string; count: bigint }> = await prisma.$queryRaw`
      SELECT game, COUNT(*)::int as count
      FROM tournaments
      GROUP BY game
      ORDER BY count DESC
      LIMIT 10
    `

    // Jogos por total de inscrições
    const gamesByParticipants: Array<{ game: string; participants: bigint }> = await prisma.$queryRaw`
      SELECT t.game, COUNT(p.id)::int as participants
      FROM tournaments t
      LEFT JOIN participants p ON p.tournament_id = t.id
      GROUP BY t.game
      ORDER BY participants DESC
      LIMIT 10
    `

    // Investimento mensal (entry fees) e ganho da plataforma (últimos 12 meses)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyInvestment: Array<{ month: string; invested: number; platform_earnings: number }> = await prisma.$queryRaw`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN type = 'TOURNAMENT_ENTRY' THEN ABS(amount) ELSE 0 END), 0) as invested,
        COALESCE(SUM(CASE WHEN type = 'PLATFORM_FEE' THEN amount ELSE 0 END), 0) as platform_earnings
      FROM transactions
      WHERE status = 'COMPLETED'
        AND type IN ('TOURNAMENT_ENTRY', 'PLATFORM_FEE')
        AND created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month ASC
    `

    // Torneios recentes (para a aba de gerenciamento)
    const recentTournaments = await prisma.tournament.findMany({
      select: {
        id: true,
        title: true,
        game: true,
        status: true,
        entryFee: true,
        prizePool: true,
        platformFee: true,
        maxParticipants: true,
        startDate: true,
        createdAt: true,
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return {
      users: { total: totalUsers, activeToday: activeUsersToday },
      tournaments: {
        total: totalTournaments,
        active: activeTournaments,
        completed: completedTournaments,
        cancelled: cancelledTournaments,
        registration: registrationTournaments,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        last30Days: revenueByDay,
        prizeDistributed: totalPrizeDistributed._sum.amount || 0,
        totalDeposits: totalDeposits._sum.amount || 0,
        totalWithdrawals: Math.abs(Number(totalWithdrawals._sum.amount || 0)),
      },
      transactions: { total: totalTransactions },
      charts: {
        revenueByDay: revenueByDay.map((r) => ({
          date: r.date,
          total: Number(r.total),
        })),
        usersByDay: usersByDay.map((u) => ({
          date: u.date,
          count: Number(u.count),
        })),
        gamesByTournaments: gamesByTournaments.map((g) => ({
          game: g.game,
          count: Number(g.count),
        })),
        gamesByParticipants: gamesByParticipants.map((g) => ({
          game: g.game,
          participants: Number(g.participants),
        })),
        tournamentsByStatus: [
          { status: 'Abertos', count: registrationTournaments },
          { status: 'Em Andamento', count: activeTournaments },
          { status: 'Finalizados', count: completedTournaments },
          { status: 'Cancelados', count: cancelledTournaments },
        ],
        monthlyFinancial: monthlyInvestment.map((m) => ({
          month: m.month,
          invested: Number(m.invested),
          platformEarnings: Number(m.platform_earnings),
        })),
      },
      recentUsers,
      recentTournaments,
    }
  }

  async banUser(userId: string, reason: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) throw new NotFoundError('Usuário não encontrado')

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.user.update({
          where: { id: userId },
          data: { isBanned: true, banReason: reason },
        }),
        tx.refreshToken.updateMany({
          where: { userId },
          data: { isRevoked: true },
        }),
      ])
    })
  }

  async unbanUser(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null },
    })
  }

  async setUserRole(userId: string, role: 'USER' | 'ADMIN' | 'MODERATOR') {
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    })
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isBanned: true,
          banReason: true,
          eloRating: true,
          level: true,
          createdAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    return { users, total, page, limit }
  }

  async getActionLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.actionLog.findMany({
        include: {
          user: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.actionLog.count(),
    ])

    return { logs, total, page, limit }
  }

  async getPlatformStats() {
    const [totalPrizeDistributed, totalDeposits, totalWithdrawals] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'TOURNAMENT_PRIZE', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'DEPOSIT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { type: 'WITHDRAWAL', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ])

    return {
      prizeDistributed: totalPrizeDistributed._sum.amount || 0,
      totalDeposits: totalDeposits._sum.amount || 0,
      totalWithdrawals: Math.abs(Number(totalWithdrawals._sum.amount || 0)),
    }
  }
}
