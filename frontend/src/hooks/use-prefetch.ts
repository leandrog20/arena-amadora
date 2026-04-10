'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { queryKeys } from '@/hooks/use-queries'

// Rotas principais que o usuário provavelmente vai acessar
const CRITICAL_ROUTES = [
  '/dashboard',
  '/tournaments',
  '/rankings',
  '/wallet',
  '/matches',
  '/notifications',
] as const

// Prefetch functions para cada recurso crítico
const prefetchFns = {
  userStats: () => api.get<{ data: any }>('/users/me/stats'),
  walletBalance: () =>
    api.get<{ data: { balance: number; frozenAmount: number } }>('/wallet/balance'),
  tournaments: () =>
    api.get<{ data: any[]; pagination: any }>('/tournaments?page=1&limit=10'),
  notifications: () =>
    api.get<{ data: { notifications: any[] } }>('/notifications'),
}

/**
 * Hook global de prefetch — centraliza prefetch de rotas e dados críticos.
 *
 * Uso:
 *   const { prefetchAfterLogin, prefetchFromDashboard, prefetchRoute } = usePrefetch()
 */
export function usePrefetch() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Prefetch de uma rota Next.js (RSC payload + JS chunks)
  const prefetchRoute = useCallback(
    (route: string) => {
      router.prefetch(route)
    },
    [router],
  )

  // Prefetch de todas as rotas críticas
  const prefetchRoutes = useCallback(() => {
    CRITICAL_ROUTES.forEach((route) => router.prefetch(route))
  }, [router])

  // Prefetch de um dado específico via React Query
  const prefetchData = useCallback(
    <T,>(key: readonly unknown[], fn: () => Promise<T>, staleTime = 5 * 60 * 1000) => {
      queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fn,
        staleTime,
      })
    },
    [queryClient],
  )

  // Prefetch dos dados críticos do dashboard (stats + wallet)
  const prefetchDashboardData = useCallback(() => {
    prefetchData(queryKeys.user.stats, prefetchFns.userStats)
    prefetchData(queryKeys.wallet.balance, prefetchFns.walletBalance)
  }, [prefetchData])

  // Prefetch dos dados de listagens (torneios, notificações)
  const prefetchListingsData = useCallback(() => {
    prefetchData(
      queryKeys.tournaments.list('page=1&limit=10'),
      prefetchFns.tournaments,
    )
    prefetchData(queryKeys.notifications.all, prefetchFns.notifications)
  }, [prefetchData])

  /**
   * Chamado imediatamente após login/register.
   * Prefetcha rotas + dados críticos em paralelo para que o dashboard
   * abra instantaneamente.
   */
  const prefetchAfterLogin = useCallback(() => {
    // Rotas — Next.js baixa JS chunks + RSC payload em background
    prefetchRoutes()

    // Dados — React Query popula o cache antes de o usuário chegar na página
    prefetchDashboardData()
    prefetchListingsData()
  }, [prefetchRoutes, prefetchDashboardData, prefetchListingsData])

  /**
   * Chamado quando o dashboard monta.
   * Prefetcha rotas e dados de páginas secundárias que o usuário
   * provavelmente vai acessar a partir do dashboard.
   */
  const prefetchFromDashboard = useCallback(() => {
    // Rotas secundárias
    prefetchRoutes()

    // Dados de listagens que ainda não estão no cache
    prefetchListingsData()
  }, [prefetchRoutes, prefetchListingsData])

  return {
    prefetchAfterLogin,
    prefetchFromDashboard,
    prefetchRoute,
    prefetchRoutes,
    prefetchDashboardData,
    prefetchListingsData,
  }
}

/**
 * Versão standalone (sem hooks) para uso fora de componentes React.
 * Útil em callbacks de Zustand ou server actions.
 * Prefetcha apenas dados (não rotas, pois precisa do router).
 */
export function prefetchCriticalData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.prefetchQuery({
    queryKey: queryKeys.user.stats,
    queryFn: prefetchFns.userStats,
    staleTime: 5 * 60 * 1000,
  })
  queryClient.prefetchQuery({
    queryKey: queryKeys.wallet.balance,
    queryFn: prefetchFns.walletBalance,
    staleTime: 5 * 60 * 1000,
  })
  queryClient.prefetchQuery({
    queryKey: queryKeys.tournaments.list('page=1&limit=10'),
    queryFn: prefetchFns.tournaments,
    staleTime: 5 * 60 * 1000,
  })
  queryClient.prefetchQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: prefetchFns.notifications,
    staleTime: 5 * 60 * 1000,
  })
}
