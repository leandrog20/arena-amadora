import { z } from 'zod'

export const createTournamentSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  game: z.string().min(1).max(100),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  maxParticipants: z.number().int().min(2).max(256),
  minParticipants: z.number().int().min(2).default(2),
  entryFee: z.number().min(0).default(0),
  rules: z.string().max(5000).optional(),
  isTeamBased: z.boolean().default(false),
  teamSize: z.number().int().min(2).max(10).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  registrationEnd: z.string().datetime().optional(),
})

export const updateTournamentSchema = createTournamentSchema.partial()

export const listTournamentsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.enum(['DRAFT', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  game: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['startDate', 'prizePool', 'createdAt', 'entryFee']).default('startDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>
export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>
export type ListTournamentsInput = z.infer<typeof listTournamentsSchema>
