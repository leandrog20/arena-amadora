import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Tournament, Match } from '@/types'

// ====== KEYS ======
export const queryKeys = {
  tournaments: {
    all: ['tournaments'] as const,
    list: (params: string) => ['tournaments', 'list', params] as const,
    detail: (id: string) => ['tournaments', id] as const,
  },
  matches: {
    byTournament: (id: string) => ['matches', 'tournament', id] as const,
    myHistory: (page: number) => ['matches', 'history', page] as const,
  },
  user: {
    stats: ['user', 'stats'] as const,
    profile: ['user', 'profile'] as const,
  },
  wallet: {
    balance: ['wallet', 'balance'] as const,
    transactions: (page: number) => ['wallet', 'transactions', page] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
}

// ====== TOURNAMENTS ======
export function useTournaments(params: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.list(params),
    queryFn: () =>
      api.get<{ data: Tournament[]; pagination: { totalPages: number } }>(
        `/tournaments?${params}`
      ),
    staleTime: 15_000,
  })
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: queryKeys.tournaments.detail(id),
    queryFn: () => api.get<{ data: Tournament }>(`/tournaments/${id}`),
    enabled: !!id,
  })
}

export function useTournamentMatches(tournamentId: string) {
  return useQuery({
    queryKey: queryKeys.matches.byTournament(tournamentId),
    queryFn: () => api.get<{ data: Match[] }>(`/matches/tournament/${tournamentId}`),
    enabled: !!tournamentId,
  })
}

export function useJoinTournament() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/join`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.tournaments.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance })
    },
  })
}

export function useLeaveTournament() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/leave`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.tournaments.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance })
    },
  })
}

export function useStartTournament() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/tournaments/${id}/start`),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.tournaments.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.matches.byTournament(id) })
    },
  })
}

// ====== MATCHES ======
export function useMyMatches(page: number) {
  return useQuery({
    queryKey: queryKeys.matches.myHistory(page),
    queryFn: () =>
      api.get<{ data: Match[]; pagination: { totalPages: number } }>(
        `/users/me/matches?page=${page}&limit=20`
      ),
  })
}

// ====== USER STATS ======
export function useUserStats() {
  return useQuery({
    queryKey: queryKeys.user.stats,
    queryFn: () => api.get<{ data: any }>('/users/me/stats'),
  })
}

// ====== WALLET ======
export function useWalletBalance() {
  return useQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: () => api.get<{ data: { balance: number; frozenAmount: number } }>('/wallet/balance'),
  })
}

export function useWalletTransactions(page: number) {
  return useQuery({
    queryKey: queryKeys.wallet.transactions(page),
    queryFn: () =>
      api.get<{ data: any[]; pagination: { totalPages: number } }>(
        `/wallet/transactions?page=${page}&limit=15`
      ),
  })
}

export function useDeposit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) => api.post('/wallet/deposit', { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance })
      qc.invalidateQueries({ queryKey: ['wallet', 'transactions'] })
    },
  })
}

export function useWithdraw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amount: number) => api.post('/wallet/withdraw', { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance })
      qc.invalidateQueries({ queryKey: ['wallet', 'transactions'] })
    },
  })
}

// ====== NOTIFICATIONS ======
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api.get<{ data: { notifications: any[] } }>('/notifications'),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}
