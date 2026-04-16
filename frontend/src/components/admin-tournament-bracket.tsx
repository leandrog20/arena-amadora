'use client'

import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Match, Tournament } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToastStore } from '@/stores/toast-store'
import { motion } from 'framer-motion'
import { Crown, AlertCircle, Loader2, X } from 'lucide-react'

interface AdminTournamentBracketProps {
  tournament: Tournament
  isOpen: boolean
  onClose: () => void
}

export function AdminTournamentBracket({ tournament, isOpen, onClose }: AdminTournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const toast = useToastStore()

  useEffect(() => {
    if (isOpen) {
      loadMatches()
    }
  }, [isOpen, tournament.id])

  async function loadMatches() {
    setLoading(true)
    try {
      const res = await api.get<{ data: Match[] }>(`/matches/tournament/${tournament.id}`)
      setMatches(res.data)
    } catch (err: any) {
      toast.error('Erro ao carregar partidas')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdvancePlayer() {
    if (!selectedMatch || !selectedWinner) return

    setAdvancing(true)
    try {
      await api.post(`/matches/${selectedMatch.id}/admin/advance`, {
        winnerId: selectedWinner,
      })
      toast.success('Jogador avançou com sucesso!')
      setSelectedMatch(null)
      setSelectedWinner(null)
      await loadMatches()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao avançar jogador')
    } finally {
      setAdvancing(false)
    }
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chaveamento - {tournament.title}</DialogTitle>
          <DialogDescription>
            Gerencie as partidas e escolha quem avança. O perdedor será eliminado automaticamente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma partida neste torneio ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-8 min-w-max p-4 bg-card border border-border rounded-lg">
              {rounds.map((round, ri) => (
                <div key={round} className="flex flex-col gap-4 min-w-[280px]">
                  <h3 className="text-sm font-semibold text-center text-muted-foreground uppercase tracking-wider">
                    {round === rounds[rounds.length - 1] && rounds.length > 1
                      ? 'Final'
                      : round === rounds[rounds.length - 2] && rounds.length > 2
                      ? 'Semifinal'
                      : `Rodada ${round}`}
                  </h3>
                  <div
                    className="flex flex-col justify-around flex-1"
                    style={{ gap: `${Math.pow(2, ri) * 16}px` }}
                  >
                    {matches
                      .filter((m) => m.round === round)
                      .map((match) => (
                        <motion.div
                          key={match.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          onClick={() => {
                            if (match.status !== 'COMPLETED') {
                              setSelectedMatch(match)
                              setSelectedWinner(null)
                            }
                          }}
                          className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                            match.status === 'COMPLETED'
                              ? 'opacity-60 cursor-not-allowed border-border'
                              : 'hover:border-primary/60 border-primary/20'
                          } ${selectedMatch?.id === match.id ? 'ring-2 ring-primary' : ''}`}
                        >
                          {/* Player 1 */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              if (match.status !== 'COMPLETED') {
                                setSelectedMatch(match)
                                setSelectedWinner(match.player1Id || '')
                              }
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-sm ${
                              selectedWinner === match.player1Id
                                ? 'bg-gaming-green/20 border-b-2 border-gaming-green'
                                : 'bg-card border-b border-border'
                            } hover:bg-muted/50 transition-colors`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {match.winnerId === match.player1Id && (
                                <Crown className="h-3 w-3 text-gaming-yellow shrink-0" />
                              )}
                              <span className="truncate text-xs">
                                {match.player1?.displayName || match.player1?.username || 'Aguardando'}
                              </span>
                            </div>
                            {match.player1Score !== null && match.status === 'COMPLETED' && (
                              <span className="text-xs font-semibold ml-2 shrink-0">
                                {match.player1Score}
                              </span>
                            )}
                          </div>

                          {/* Player 2 */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              if (match.status !== 'COMPLETED') {
                                setSelectedMatch(match)
                                setSelectedWinner(match.player2Id || '')
                              }
                            }}
                            className={`flex items-center justify-between px-3 py-2 text-sm ${
                              selectedWinner === match.player2Id
                                ? 'bg-gaming-green/20'
                                : 'bg-card'
                            } hover:bg-muted/50 transition-colors`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {match.winnerId === match.player2Id && (
                                <Crown className="h-3 w-3 text-gaming-yellow shrink-0" />
                              )}
                              <span className="truncate text-xs">
                                {match.player2?.displayName || match.player2?.username || 'Aguardando'}
                              </span>
                            </div>
                            {match.player2Score !== null && match.status === 'COMPLETED' && (
                              <span className="text-xs font-semibold ml-2 shrink-0">
                                {match.player2Score}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selection Dialog */}
        {selectedMatch && (
          <div className="border-t border-border pt-4 mt-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Selecione quem avançará:</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={selectedWinner === selectedMatch.player1Id ? 'gaming' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWinner(selectedMatch.player1Id || '')}
                  className="text-xs"
                >
                  {selectedMatch.player1?.displayName ||
                    selectedMatch.player1?.username ||
                    'Jogador 1'}
                </Button>
                <Button
                  variant={selectedWinner === selectedMatch.player2Id ? 'gaming' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedWinner(selectedMatch.player2Id || '')}
                  className="text-xs"
                >
                  {selectedMatch.player2?.displayName ||
                    selectedMatch.player2?.username ||
                    'Jogador 2'}
                </Button>
              </div>

              {selectedWinner && (
                <div className="bg-gaming-green/10 border border-gaming-green/30 rounded p-2 text-xs text-gaming-green">
                  ✓ O outro jogador será eliminado automaticamente.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleAdvancePlayer}
                  disabled={!selectedWinner || advancing}
                  isLoading={advancing}
                  className="flex-1 text-xs"
                  variant="gaming"
                >
                  {advancing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Avançando...
                    </>
                  ) : (
                    'Confirmar Avanço'
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedMatch(null)
                    setSelectedWinner(null)
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
