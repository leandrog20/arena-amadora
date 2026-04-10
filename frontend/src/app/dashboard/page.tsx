'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useUserStats, useWalletBalance } from '@/hooks/use-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  Trophy,
  Swords,
  TrendingUp,
  Wallet,
  Star,
  Target,
  Flame,
  Award,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: statsRes, isLoading: statsLoading } = useUserStats()
  const { data: walletRes, isLoading: walletLoading } = useWalletBalance()

  const stats = statsRes?.data
  const wallet = walletRes?.data
  const loading = statsLoading || walletLoading

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Rating ELO',
      value: stats?.eloRating || 1000,
      icon: TrendingUp,
      color: 'text-gaming-purple',
      bg: 'bg-gaming-purple/10',
    },
    {
      title: 'Partidas',
      value: `${stats?.gamesWon || 0}/${stats?.gamesPlayed || 0}`,
      subtitle: `${stats?.winRate || 0}% win rate`,
      icon: Swords,
      color: 'text-gaming-blue',
      bg: 'bg-gaming-blue/10',
    },
    {
      title: 'Torneios Vencidos',
      value: stats?.tournamentsWon || 0,
      icon: Trophy,
      color: 'text-gaming-yellow',
      bg: 'bg-gaming-yellow/10',
    },
    {
      title: 'Saldo',
      value: `R$ ${Number(wallet?.balance || 0).toFixed(2)}`,
      icon: Wallet,
      color: 'text-gaming-green',
      bg: 'bg-gaming-green/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">
            Olá, <span className="text-gradient">{user?.displayName || user?.username}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Nível {stats?.level || 1} • {stats?.xp || 0} XP
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tournaments">
            <Button variant="gaming">
              <Trophy className="h-4 w-4 mr-2" />
              Ver Torneios
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    {stat.subtitle && (
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`h-12 w-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-gaming-red" />
              Sequência de Vitórias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{stats?.winStreak || 0}</p>
                <p className="text-sm text-muted-foreground">Atual</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-gaming-yellow">{stats?.bestWinStreak || 0}</p>
                <p className="text-sm text-muted-foreground">Melhor</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gaming-cyan" />
              Ganhos Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gaming-green">
              R$ {Number(stats?.totalEarnings || 0).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Em premiações de torneios
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
