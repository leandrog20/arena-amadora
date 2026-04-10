'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { MemoizedNavbar } from '@/components/layout/navbar'
import { ToastContainer } from '@/components/ui/toast-container'

export function Providers({ children }: { children: React.ReactNode }) {
  const { fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return (
    <div className="min-h-screen bg-background">
      <MemoizedNavbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <ToastContainer />
    </div>
  )
}
