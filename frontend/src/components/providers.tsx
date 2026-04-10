'use client'

import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query-client'
import { useAuthStore } from '@/stores/auth-store'
import { MemoizedNavbar } from '@/components/layout/navbar'
import { ToastContainer } from '@/components/ui/toast-container'

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchUser } = useAuthStore()
  const queryClient = getQueryClient()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <MemoizedNavbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <ToastContainer />
      </div>
    </QueryClientProvider>
  )
}
