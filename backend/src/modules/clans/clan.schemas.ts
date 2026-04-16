import { z } from 'zod'

export const createClanSchema = z.object({
  name: z.string().min(3).max(50),
  tag: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/i, 'Apenas letras e números'),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
})

export const inviteMemberSchema = z.object({
  username: z.string().min(1),
})

export const updateClanSchema = z.object({
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DISBANDED']).optional(),
})

export const updateCoLeaderSchema = z.object({
  userId: z.string().uuid(),
})

export type CreateClanInput = z.infer<typeof createClanSchema>
export type UpdateClanInput = z.infer<typeof updateClanSchema>
export type UpdateCoLeaderInput = z.infer<typeof updateCoLeaderSchema>
