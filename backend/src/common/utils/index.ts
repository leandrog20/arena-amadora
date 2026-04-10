import { FastifyReply } from 'fastify'

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({
    success: true,
    data,
  })
}

export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return reply.status(200).send({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export function getClientIp(request: { headers: Record<string, string | string[] | undefined>; ip: string }): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return request.ip
}

export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '')
    .trim()
}

export function calculateElo(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  kFactor = 32
): { newRatingA: number; newRatingB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA

  const newRatingA = Math.round(ratingA + kFactor * (scoreA - expectedA))
  const newRatingB = Math.round(ratingB + kFactor * ((1 - scoreA) - expectedB))

  return { newRatingA, newRatingB }
}

export function calculateXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5))
}

export function calculateLevelFromXp(xp: number): number {
  let level = 1
  let totalXpNeeded = 0
  while (true) {
    totalXpNeeded += calculateXpForLevel(level)
    if (xp < totalXpNeeded) break
    level++
  }
  return level
}
