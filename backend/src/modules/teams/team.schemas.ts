import { z } from 'zod'

export const createTeamSchema = z.object({
  name: z.string().min(3).max(50),
  tag: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/i, 'Apenas letras e números'),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
})

export const inviteMemberSchema = z.object({
  username: z.string().min(1),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
