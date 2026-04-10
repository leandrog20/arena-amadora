import { z } from 'zod'

export const createDisputeSchema = z.object({
  matchId: z.string().uuid(),
  reason: z.string().min(10).max(1000),
  evidence: z.string().optional(),
})

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(5).max(1000),
  winnerId: z.string().uuid().optional(),
  status: z.enum(['RESOLVED', 'REJECTED']),
})

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>
