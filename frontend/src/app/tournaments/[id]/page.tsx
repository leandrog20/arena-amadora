'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { Tournament, Match, Participant } from '@/types'
import {
  useTournament,
  useTournamentMatches,
  useTournamentParticipants,
  useJoinTournament,
  useLeaveTournament,
  useStartTournament,
} from '@/hooks/use-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  Trophy,
  Users,
  Calendar,
  ArrowLeft,
  Swords,
  LogIn,
  LogOut,
  DollarSign,
  Gamepad2,
  Shield,
  Crown,
  Play,
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

export default function TournamentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const toast = useToastStore()
  const id = params.id as string

  const { data: tRes, isLoading: tLoading } = useTournament(id)
  const { data: mRes, isLoading: mLoading } = useTournamentMatches(id)

  const tournament = tRes?.data || null
  const matches = mRes?.data || []

  const [tab, setTab] = useState<'info' | 'bracket' | 'participants'>('info')

  // Participants carregam separadamente — só busca quando a aba é aberta
  const { data: pRes, isLoading: pLoading } = useTournamentParticipants(id, tab === 'participants')
  const participants = pRes?.data || []

  const joinMutation = useJoinTournament()
  const leaveMutation = useLeaveTournament()
  const startMutation = useStartTournament()
  const actionLoading = joinMutation.isPending || leaveMutation.isPending || startMutation.isPending

  // isParticipant vem do backend (check rápido por PK)
  const isParticipant = (tournament as any)?.isParticipant === true
  const isCreatorOrAdmin = user?.role === 'ADMIN' || tournament?.createdById === user?.id

  async function handleJoin() {
    try {
      await joinMutation.mutateAsync(id)
      toast.success('Inscrição realizada com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao se inscrever')
    }
  }

  async function handleLeave() {
    try {
      await leaveMutation.mutateAsync(id)
      toast.success('Inscrição cancelada')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao cancelar inscrição')
    }
  }

  async function handleStart() {
    try {
      await startMutation.mutateAsync(id)
      toast.success('Torneio iniciado! Chaveamento gerado.')
      setTab('bracket')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao iniciar torneio')
    }
  }

  if (tLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">Torneio não encontrado</h2>
        <Link href="/tournaments">
          <Button variant="outline" className="mt-4">
            Voltar aos torneios
          </Button>
        </Link>
      </div>
    )
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/tournaments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar aos torneios
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusMap[tournament.status]?.variant || 'default'} className="text-sm">
                    {statusMap[tournament.status]?.label || tournament.status}
                  </Badge>
                  <Badge variant="outline">{formatMap[tournament.format] || tournament.format}</Badge>
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold">{tournament.title}</h1>
                {tournament.description && (
                  <p className="text-muted-foreground max-w-xl">{tournament.description}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {tournament.status === 'REGISTRATION' && user && !isParticipant && (
                  <Button variant="gaming" onClick={handleJoin} isLoading={actionLoading}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Inscrever-se
                    {tournament.entryFee > 0 && ` (R$ ${Number(tournament.entryFee).toFixed(2)})`}
                  </Button>
                )}
                {tournament.status === 'REGISTRATION' && isParticipant && (
                  <Button variant="destructive" onClick={handleLeave} isLoading={actionLoading}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Cancelar Inscrição
                  </Button>
                )}
                {tournament.status === 'REGISTRATION' && isCreatorOrAdmin && (
                  <Button variant="gaming" onClick={handleStart} isLoading={actionLoading}>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Torneio
                  </Button>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
              <div className="text-center">
                <Gamepad2 className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Jogo</p>
                <p className="font-semibold">{tournament.game}</p>
              </div>
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="font-semibold">
                  {tournament._count?.participants || 0}/{tournament.maxParticipants}
                </p>
              </div>
              <div className="text-center">
                <DollarSign className="h-5 w-5 mx-auto text-gaming-green mb-1" />
                <p className="text-sm text-muted-foreground">Premiação</p>
                <p className="font-semibold text-gaming-green">
                  R$ {Number(tournament.prizePool).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm text-muted-foreground">Início</p>
                <p className="font-semibold">
                  {tournament.startDate
                    ? new Date(tournament.startDate).toLocaleDateString('pt-BR')
                    : 'A definir'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['info', 'bracket', 'participants'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'info' ? 'Informações' : t === 'bracket' ? 'Chave / Partidas' : 'Participantes'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'info' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {tournament.rules || 'Nenhuma regra definida.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === 'bracket' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {mLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : rounds.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma partida gerada ainda</p>
              </CardContent>
            </Card>
          ) : (
            rounds.map((round) => (
              <div key={round}>
                <h3 className="text-lg font-semibold mb-3">Rodada {round}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matches
                    .filter((m) => m.round === round)
                    .map((match) => (
                      <Card
                        key={match.id}
                        className={`hover:border-primary/20 transition-colors ${
                          match.status === 'COMPLETED' ? 'opacity-80' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
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
                            <span className="text-xs text-muted-foreground">
                              Partida {match.position}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div
                              className={`flex items-center justify-between p-2 rounded ${
                                match.winnerId === match.player1Id
                                  ? 'bg-gaming-green/10 border border-gaming-green/20'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <span className="font-medium flex items-center gap-1">
                                {match.winnerId === match.player1Id && (
                                  <Crown className="h-4 w-4 text-gaming-yellow" />
                                )}
                                {match.player1?.displayName || match.player1?.username || 'TBD'}
                              </span>
                              <span className="font-bold">{match.player1Score ?? '-'}</span>
                            </div>
                            <div
                              className={`flex items-center justify-between p-2 rounded ${
                                match.winnerId === match.player2Id
                                  ? 'bg-gaming-green/10 border border-gaming-green/20'
                                  : 'bg-muted/50'
                              }`}
                            >
                              <span className="font-medium flex items-center gap-1">
                                {match.winnerId === match.player2Id && (
                                  <Crown className="h-4 w-4 text-gaming-yellow" />
                                )}
                                {match.player2?.displayName || match.player2?.username || 'TBD'}
                              </span>
                              <span className="font-bold">{match.player2Score ?? '-'}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {tab === 'participants' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {pLoading ? (
                <div className="space-y-0">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border-b border-border last:border-0">
                      <Skeleton className="h-4 w-6" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : participants.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum participante inscrito</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {participants.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">#{i + 1}</span>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(p.user?.displayName || p.user?.username || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{p.user?.displayName || p.user?.username}</p>
                          <p className="text-xs text-muted-foreground">ELO: {p.user?.eloRating || '-'}</p>
                        </div>
                      </div>
                      <Badge variant={p.isEliminated ? 'destructive' : 'secondary'}>
                        {p.isEliminated ? 'Eliminado' : 'Ativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
