'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { TrendingUp, Medal, Crown } from 'lucide-react'

interface RankedUser {
  id: string
  username: string
  displayName: string | null
  eloRating: number
  level: number
  gamesWon: number
  gamesPlayed: number
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<RankedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<{ data: RankedUser[] }>('/rankings/global?limit=50')
        setPlayers(res.data)
      } catch {
        //
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const medalColors = ['text-gaming-yellow', 'text-gray-400', 'text-amber-600']

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Rankings</h1>
        <p className="text-muted-foreground mt-1">Os melhores jogadores da plataforma</p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gaming-purple" />
            Ranking Global
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhum jogador ranqueado ainda
            </div>
          ) : (
            <div className="divide-y divide-border">
              {players.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center justify-between p-4 ${
                    i < 3 ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center">
                      {i < 3 ? (
                        <Crown className={`h-5 w-5 mx-auto ${medalColors[i]}`} />
                      ) : (
                        <span className="text-sm text-muted-foreground font-bold">
                          {i + 1}
                        </span>
                      )}
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {(player.displayName || player.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{player.displayName || player.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Nível {player.level} • {player.gamesWon}/{player.gamesPlayed} vitórias
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gaming-purple">{player.eloRating}</p>
                    <p className="text-xs text-muted-foreground">ELO</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
