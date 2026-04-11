'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ROOT ERROR BOUNDARY:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <h2 className="text-2xl font-bold text-red-500">Algo deu errado</h2>
      <pre className="text-sm text-muted-foreground max-w-lg overflow-auto bg-card p-4 rounded border">
        {error.message}
      </pre>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
      >
        Tentar novamente
      </button>
    </div>
  )
}
