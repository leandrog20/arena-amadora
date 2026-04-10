import { Redis } from 'ioredis'
import { env } from './env'

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Não derrubar o app se Redis estiver fora — funciona como fallback sem cache
  retryStrategy(times) {
    if (times > 5) return null // para de reconectar
    return Math.min(times * 200, 2000)
  },
})

let isConnected = false

redis.on('connect', () => {
  isConnected = true
  console.log('✅ Redis conectado')
})

redis.on('error', (err) => {
  isConnected = false
  console.warn('⚠️ Redis erro (cache desabilitado):', err.message)
})

redis.on('close', () => {
  isConnected = false
})

// Conectar de forma lazy — não bloqueia o boot do app
redis.connect().catch(() => {
  console.warn('⚠️ Redis indisponível — cache desabilitado, usando apenas DB')
})

/**
 * Cache helper resiliente — se Redis estiver fora, executa a query direto.
 *
 * @param key   Chave do cache (ex: "ranking:global:1:50")
 * @param ttl   TTL em segundos
 * @param fn    Função que busca os dados do banco
 */
export async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  if (!isConnected) return fn()

  try {
    const hit = await redis.get(key)
    if (hit) return JSON.parse(hit) as T
  } catch {
    // Redis falhou na leitura — segue sem cache
  }

  const data = await fn()

  // Salva em background (fire-and-forget) — não bloqueia a resposta
  if (isConnected) {
    redis.setex(key, ttl, JSON.stringify(data)).catch(() => {})
  }

  return data
}

/** Invalida chaves por padrão glob (ex: "ranking:*") */
export async function invalidateCache(pattern: string) {
  if (!isConnected) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Redis indisponível — ignora
  }
}

export { redis }
