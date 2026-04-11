import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Adiciona connection_limit à URL se não configurada
function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || ''
  if (url.includes('connection_limit')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}connection_limit=20&pool_timeout=30`
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

// Em desenvolvimento, reutiliza a instância entre hot-reloads
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
