import { z } from 'zod'

export const depositSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo').min(1, 'Mínimo R$ 1,00'),
  idempotencyKey: z.string().uuid().optional(),
})

export const withdrawSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo').min(10, 'Mínimo R$ 10,00 para saque'),
  idempotencyKey: z.string().uuid().optional(),
})

export const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TOURNAMENT_ENTRY', 'TOURNAMENT_PRIZE', 'PLATFORM_FEE', 'REFUND']).optional(),
})

export type DepositInput = z.infer<typeof depositSchema>
export type WithdrawInput = z.infer<typeof withdrawSchema>
export type ListTransactionsInput = z.infer<typeof listTransactionsSchema>
