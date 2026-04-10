'use client'

import { QueryClient } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5min — evita refetch desnecessário entre navegações
        gcTime: 10 * 60 * 1000, // 10min — mantém cache por mais tempo
        refetchOnWindowFocus: false,
        refetchOnMount: false, // dados prefetchados não são rebuscados ao montar
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
