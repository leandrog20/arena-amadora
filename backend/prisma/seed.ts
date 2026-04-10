import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')
  console.log(`   Conectando em: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)

  // Teste de conexão
  await prisma.$queryRaw`SELECT 1`
  console.log('   ✅ Conexão com banco OK')

  // Admin — upsert garante idempotência
  const adminPassword = await bcrypt.hash('Admin@123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arena.com' },
    update: {
      role: 'ADMIN',
      isVerified: true,
    },
    create: {
      email: 'admin@arena.com',
      username: 'admin',
      passwordHash: adminPassword,
      displayName: 'Administrador',
      role: 'ADMIN',
      isVerified: true,
    },
  })
  console.log(`   👤 Admin: ${admin.email} (${admin.id})`)

  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, balance: 0 },
  })
  console.log('   💰 Wallet do admin OK')

  // Achievements — upsert por código
  const achievements = [
    { code: 'FIRST_WIN', name: 'Primeira Vitória', description: 'Vença sua primeira partida', xpReward: 50, condition: { type: 'wins', value: 1 } },
    { code: 'WIN_STREAK_5', name: 'Imparável', description: 'Vença 5 partidas seguidas', xpReward: 150, condition: { type: 'winStreak', value: 5 } },
    { code: 'WIN_STREAK_10', name: 'Lendário', description: 'Vença 10 partidas seguidas', xpReward: 500, condition: { type: 'winStreak', value: 10 } },
    { code: 'TOURNAMENT_WIN', name: 'Campeão', description: 'Vença um torneio', xpReward: 200, condition: { type: 'tournamentWins', value: 1 } },
    { code: 'GAMES_10', name: 'Veterano', description: 'Jogue 10 partidas', xpReward: 100, condition: { type: 'gamesPlayed', value: 10 } },
    { code: 'GAMES_50', name: 'Experiente', description: 'Jogue 50 partidas', xpReward: 300, condition: { type: 'gamesPlayed', value: 50 } },
    { code: 'GAMES_100', name: 'Mestre', description: 'Jogue 100 partidas', xpReward: 500, condition: { type: 'gamesPlayed', value: 100 } },
    { code: 'ELO_1500', name: 'Platina', description: 'Alcance 1500 de ELO', xpReward: 200, condition: { type: 'elo', value: 1500 } },
    { code: 'ELO_2000', name: 'Diamante', description: 'Alcance 2000 de ELO', xpReward: 500, condition: { type: 'elo', value: 2000 } },
  ]

  let created = 0
  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: { name: ach.name, description: ach.description, xpReward: ach.xpReward, condition: ach.condition },
      create: ach,
    })
    created++
  }
  console.log(`   🏆 ${created} achievements sincronizados`)

  console.log('✅ Seed concluído com sucesso!')
  console.log(`   Admin: admin@arena.com / Admin@123`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e.message || e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
