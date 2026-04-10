import { z } from 'zod'

export const submitResultSchema = z.object({
  player1Score: z.number().int().min(0),
  player2Score: z.number().int().min(0),
  winnerId: z.string().uuid(),
})

export const updateMatchSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED']).optional(),
  player1Score: z.number().int().min(0).optional(),
  player2Score: z.number().int().min(0).optional(),
  winnerId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
})

export type SubmitResultInput = z.infer<typeof submitResultSchema>
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>
