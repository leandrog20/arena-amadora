'use client'

import { useState } from 'react'
import { useGlobalRanking } from '@/hooks/use-queries'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { TrendingUp, Crown, Users } from 'lucide-react'
import Link from 'next/link'

interface RankedPlayer {
  rank: number
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  eloRating: number
  level: number
  gamesPlayed: number
  gamesWon: number
  winRate?: number
  bestWinStreak?: number
}

interface RankedTeam {
  rank: number
  id: string
  name: string
  tag: string
  eloRating: number
  _count?: { members: number }
}

export default function RankingsPage() {
  const [tab, setTab] = useState<'global' | 'game' | 'teams'>('global')
  const [game, setGame] = useState('')

  const { data: rankingRes, isLoading: loading } = useGlobalRanking(50)
  const players = (rankingRes?.data?.players ?? rankingRes?.data ?? []) as RankedPlayer[]

  const { data: gameRes, isLoading: gameLoading } = useQuery({
    queryKey: ['rankings', 'game', game],
    queryFn: () => api.get<{ data: RankedPlayer[] }>(`/rankings/game/${encodeURIComponent(game)}?limit=50`, { requireAuth: false }),
    enabled: tab === 'game' && !!game,
  })
  const gamePlayers = (gameRes?.data ?? []) as RankedPlayer[]

  const { data: teamsRes, isLoading: teamsLoading } = useQuery({
    queryKey: ['rankings', 'teams'],
    queryFn: () => api.get<{ data: RankedTeam[] }>('/rankings/teams?limit=50', { requireAuth: false }),
    enabled: tab === 'teams',
  })
  const teams = (teamsRes?.data ?? []) as RankedTeam[]

  const medalColors = ['text-gaming-yellow', 'text-gray-400', 'text-amber-600']

  const commonGames = ['League of Legends', 'Valorant', 'CS2', 'Fortnite', 'Free Fire', 'FIFA']

  const activeList = tab === 'game' ? gamePlayers : players
  const activeLoading = tab === 'global' ? loading : tab === 'game' ? gameLoading : teamsLoading

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Rankings</h1>
        <p className="text-muted-foreground mt-1">Os melhores jogadores da plataforma</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'global', label: 'Global' },
          { key: 'game', label: 'Por Jogo' },
          { key: 'teams', label: 'Equipes' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Game filter */}
      {tab === 'game' && (
        <div className="flex gap-2 flex-wrap">
          {commonGames.map((g) => (
            <button
              key={g}
              onClick={() => setGame(g)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                game === g
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Teams ranking */}
      {tab === 'teams' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gaming-green" />
              Ranking de Equipes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teamsLoading ? (
              <div className="space-y-2 p-6">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : teams.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">Nenhuma equipe ranqueada</div>
            ) : (
              <div className="divide-y divide-border">
                {teams.map((team, i) => (
                  <Link key={team.id} href={`/teams/${team.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center">
                        {i < 3 ? (
                          <Crown className={`h-5 w-5 mx-auto ${medalColors[i]}`} />
                        ) : (
                          <span className="text-sm text-muted-foreground font-bold">{i + 1}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{team.name}</p>
                        <p className="text-xs text-muted-foreground">[{team.tag}] • {team._count?.members || 0} membros</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gaming-green">{team.eloRating}</p>
                      <p className="text-xs text-muted-foreground">ELO</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Players ranking (global + game) */}
      {tab !== 'teams' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gaming-purple" />
              {tab === 'global' ? 'Ranking Global' : `Ranking - ${game || 'Selecione um jogo'}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeLoading ? (
              <div className="space-y-2 p-6">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (tab === 'game' && !game) ? (
              <div className="py-12 text-center text-muted-foreground">
                Selecione um jogo acima
              </div>
            ) : activeList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum jogador ranqueado
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeList.map((player, i) => (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <Link
                      href={`/profile/${player.username}`}
                      className={`flex items-center justify-between p-4 transition-colors hover:bg-muted/50 ${
                        i < 3 ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 text-center">
                          {i < 3 ? (
                            <Crown className={`h-5 w-5 mx-auto ${medalColors[i]}`} />
                          ) : (
                            <span className="text-sm text-muted-foreground font-bold">{i + 1}</span>
                          )}
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(player.displayName || player.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{player.displayName || player.username}</p>
                          <p className="text-xs text-muted-foreground">
                            Nível {player.level} • {player.gamesWon}/{player.gamesPlayed} vitórias
                            {player.winRate !== undefined && ` (${player.winRate}%)`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gaming-purple">{player.eloRating}</p>
                        <p className="text-xs text-muted-foreground">ELO</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
