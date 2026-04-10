'use client'

import { useState } from 'react'
import { useMyMatches } from '@/hooks/use-queries'
import { Match } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { Swords, Crown, ChevronLeft, ChevronRight } from 'lucide-react'

export default function MatchesPage() {
  const [page, setPage] = useState(1)
  const { data: res, isLoading: loading } = useMyMatches(page)

  const matches = res?.data || []
  const totalPages = res?.pagination?.totalPages || 1

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Minhas Partidas</h1>
        <p className="text-muted-foreground mt-1">Histórico de partidas disputadas</p>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma partida encontrada</h3>
            <p className="text-muted-foreground mt-1">Inscreva-se em um torneio para começar!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => (
            <div key={match.id}>
              <Card className="hover:border-primary/20 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={
                          match.status === 'COMPLETED'
                            ? 'info'
                            : match.status === 'IN_PROGRESS'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {match.status === 'COMPLETED'
                          ? 'Finalizada'
                          : match.status === 'IN_PROGRESS'
                          ? 'Em Andamento'
                          : 'Pendente'}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="font-medium flex items-center gap-1">
                          {match.winnerId === match.player1Id && (
                            <Crown className="h-4 w-4 text-gaming-yellow" />
                          )}
                          {match.player1?.displayName || 'Jogador 1'}
                        </span>
                        <span className="text-muted-foreground font-bold">
                          {match.player1Score ?? 0} x {match.player2Score ?? 0}
                        </span>
                        <span className="font-medium flex items-center gap-1">
                          {match.winnerId === match.player2Id && (
                            <Crown className="h-4 w-4 text-gaming-yellow" />
                          )}
                          {match.player2?.displayName || 'Jogador 2'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      Rodada {match.round}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
