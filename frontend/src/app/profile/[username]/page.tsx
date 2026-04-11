'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  Trophy,
  Swords,
  TrendingUp,
  Star,
  Award,
  UserPlus,
} from 'lucide-react'

interface PublicProfile {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  xp: number
  level: number
  eloRating: number
  gamesPlayed: number
  gamesWon: number
  bestWinStreak: number
  createdAt: string
  achievements: Array<{
    id: string
    unlockedAt: string
    achievement: {
      id: string
      name: string
      description: string
      code: string
      xpReward: number
    }
  }>
  _count: { participations: number; achievements: number }
}

export default function PublicProfilePage() {
  const params = useParams()
  const username = params.username as string
  const { user } = useAuthStore()
  const toast = useToastStore()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => {
    api.get<{ data: PublicProfile }>(`/users/profile/${username}`, { requireAuth: false })
      .then((res) => setProfile(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [username])

  async function addFriend() {
    setAddLoading(true)
    try {
      await api.post('/social/friends/request', { username })
      toast.success('Solicitação enviada!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setAddLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-xl font-bold">Usuário não encontrado</p>
      </div>
    )
  }

  const winRate = profile.gamesPlayed > 0
    ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                {(profile.displayName || profile.username)[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {profile.displayName || profile.username}
                </h1>
                <p className="text-muted-foreground">@{profile.username}</p>
                {profile.bio && <p className="text-sm mt-1">{profile.bio}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">Nível {profile.level}</Badge>
                  <Badge variant="premium">ELO {profile.eloRating}</Badge>
                </div>
              </div>
              {user && user.id !== profile.id && (
                <Button variant="gaming" onClick={addFriend} isLoading={addLoading}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Swords className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{profile.gamesPlayed}</p>
            <p className="text-xs text-muted-foreground">Partidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto text-gaming-yellow mb-1" />
            <p className="text-2xl font-bold">{profile.gamesWon}</p>
            <p className="text-xs text-muted-foreground">Vitórias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-gaming-green mb-1" />
            <p className="text-2xl font-bold">{winRate}%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-5 w-5 mx-auto text-gaming-purple mb-1" />
            <p className="text-2xl font-bold">{profile.bestWinStreak}</p>
            <p className="text-xs text-muted-foreground">Melhor Sequência</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {profile.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gaming-yellow" />
              Conquistas ({profile._count.achievements})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.achievements.map((ua) => (
                <div
                  key={ua.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30"
                >
                  <div className="h-10 w-10 rounded-lg bg-gaming-yellow/10 flex items-center justify-center">
                    <Award className="h-5 w-5 text-gaming-yellow" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{ua.achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{ua.achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member since */}
      <p className="text-center text-sm text-muted-foreground">
        Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })}
      </p>
    </div>
  )
}
