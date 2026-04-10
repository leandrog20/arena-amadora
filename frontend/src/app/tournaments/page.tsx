'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTournaments, queryKeys } from '@/hooks/use-queries'
import { api } from '@/services/api'
import { Tournament } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  Trophy,
  Users,
  Calendar,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  DollarSign,
  Plus,
} from 'lucide-react'
import Link from 'next/link'

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info' }> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  REGISTRATION: { label: 'Inscrições Abertas', variant: 'success' },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'warning' },
  COMPLETED: { label: 'Finalizado', variant: 'info' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
}

const formatMap: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminatória Simples',
  DOUBLE_ELIMINATION: 'Eliminatória Dupla',
  ROUND_ROBIN: 'Todos contra Todos',
  SWISS: 'Sistema Suíço',
}

export default function TournamentsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounce search: espera 400ms antes de buscar
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    params.append('page', String(page))
    params.append('limit', '12')
    if (debouncedSearch) params.append('search', debouncedSearch)
    if (statusFilter) params.append('status', statusFilter)
    return params.toString()
  }, [page, debouncedSearch, statusFilter])

  const { data: res, isLoading: loading } = useTournaments(queryParams)
  const qc = useQueryClient()
  const router = useRouter()

  const handleCardHover = useCallback((id: string) => {
    qc.prefetchQuery({
      queryKey: queryKeys.tournaments.detail(id),
      queryFn: () => api.get<{ data: Tournament }>(`/tournaments/${id}`),
      staleTime: 60_000,
    })
    router.prefetch(`/tournaments/${id}`)
  }, [qc, router])

  const tournaments = res?.data || []
  const totalPages = res?.pagination?.totalPages || 1

  // Prefetch da próxima página para paginação instantânea
  useEffect(() => {
    if (page < totalPages) {
      const nextParams = new URLSearchParams()
      nextParams.append('page', String(page + 1))
      nextParams.append('limit', '12')
      if (debouncedSearch) nextParams.append('search', debouncedSearch)
      if (statusFilter) nextParams.append('status', statusFilter)
      const next = nextParams.toString()

      qc.prefetchQuery({
        queryKey: queryKeys.tournaments.list(next),
        queryFn: () => api.get(`/tournaments?${next}`),
        staleTime: 60_000,
      })
    }
  }, [page, totalPages, debouncedSearch, statusFilter, qc])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Torneios</h1>
          <p className="text-muted-foreground mt-1">
            Encontre torneios e dispute premiações
          </p>
        </div>
        <Link href="/tournaments/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Torneio
          </Button>
        </Link>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar torneios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            Todos
          </Button>
          <Button
            variant={statusFilter === 'REGISTRATION' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('REGISTRATION')}
          >
            Abertos
          </Button>
          <Button
            variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            Em Andamento
          </Button>
          <Button
            variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Finalizados
          </Button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhum torneio encontrado</h3>
            <p className="text-muted-foreground mt-1">
              Tente alterar os filtros de busca
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          key={queryParams}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {tournaments.map((t) => (
            <div key={t.id} onMouseEnter={() => handleCardHover(t.id)}>
              <Link href={`/tournaments/${t.id}`}>
                <Card className="h-full hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant={statusMap[t.status]?.variant || 'default'}>
                        {statusMap[t.status]?.label || t.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatMap[t.format] || t.format}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{t.title}</h3>
                    {t.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {t.description}
                      </p>
                    )}

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Gamepad2 className="h-4 w-4" />
                          {t.game}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {t._count?.participants || 0}/{t.maxParticipants}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-gaming-green font-semibold">
                          <DollarSign className="h-4 w-4" />
                          R$ {Number(t.prizePool).toFixed(2)}
                        </span>
                        {t.entryFee > 0 && (
                          <span className="text-muted-foreground">
                            Entrada: R$ {Number(t.entryFee).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {t.startDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.startDate).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
