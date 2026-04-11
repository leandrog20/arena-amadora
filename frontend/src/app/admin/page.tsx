'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToastStore } from '@/stores/toast-store'
import { motion } from 'framer-motion'
import {
  Shield,
  Users,
  Trophy,
  DollarSign,
  Ban,
  UserCheck,
  TrendingUp,
} from 'lucide-react'

interface AdminDashboard {
  totalUsers: number
  totalTournaments: number
  activeTournaments: number
  totalRevenue: number
  recentUsers: Array<{
    id: string
    username: string
    email: string
    createdAt: string
    status: string
  }>
}

interface AdminUser {
  id: string
  username: string
  displayName: string | null
  email: string
  role: string
  status: string
  createdAt: string
}

interface Dispute {
  id: string
  status: string
  reason: string
  resolution: string | null
  createdAt: string
  creator: { username: string }
  match: {
    tournament: { title: string }
    player1: { username: string }
    player2: { username: string }
  }
}

export default function AdminPage() {
  const toast = useToastStore()
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'users' | 'disputes'>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [dRes, uRes, diRes] = await Promise.all([
          api.get<{ data: AdminDashboard }>('/admin/dashboard'),
          api.get<{ data: AdminUser[] }>('/admin/users?limit=50'),
          api.get<{ data: { disputes: Dispute[] } }>('/disputes?limit=50'),
        ])
        setDashboard(dRes.data)
        setUsers(uRes.data)
        setDisputes(diRes.data.disputes || [])
      } catch {
        //
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function toggleBan(userId: string, currentStatus: string) {
    setActionLoading(userId)
    try {
      if (currentStatus === 'BANNED') {
        await api.patch(`/admin/users/${userId}/unban`)
        toast.success('Usuário desbanido')
      } else {
        await api.patch(`/admin/users/${userId}/ban`, { reason: 'Violação dos termos' })
        toast.success('Usuário banido')
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: currentStatus === 'BANNED' ? 'ACTIVE' : 'BANNED' }
            : u
        )
      )
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setActionLoading(null)
    }
  }

  async function resolveDispute(disputeId: string, status: string, resolution: string) {
    setActionLoading(disputeId)
    try {
      await api.patch(`/disputes/${disputeId}/resolve`, { status, resolution })
      toast.success('Disputa resolvida')
      setDisputes((prev) =>
        prev.map((d) => (d.id === disputeId ? { ...d, status, resolution } : d))
      )
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8 text-gaming-red" />
          Painel Admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerenciamento da plataforma
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'overview', label: 'Visão Geral' },
          { key: 'users', label: 'Usuários' },
          { key: 'disputes', label: 'Disputas' },
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

      {tab === 'overview' && dashboard && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gaming-blue/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-gaming-blue" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                  <p className="text-2xl font-bold">{dashboard.totalUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gaming-yellow/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-gaming-yellow" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Torneios</p>
                  <p className="text-2xl font-bold">{dashboard.totalTournaments}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gaming-green/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-gaming-green" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{dashboard.activeTournaments}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gaming-purple/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-gaming-purple" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <p className="text-2xl font-bold">
                    R$ {Number(dashboard.totalRevenue || 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent users */}
          <Card>
            <CardHeader>
              <CardTitle>Últimos Cadastros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {dashboard.recentUsers?.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'}>
                        {u.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(u.displayName || u.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{u.displayName || u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={u.role === 'ADMIN' ? 'premium' : 'outline'}>
                        {u.role}
                      </Badge>
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'destructive'}>
                        {u.status}
                      </Badge>
                      <Button
                        variant={u.status === 'BANNED' ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={() => toggleBan(u.id, u.status)}
                        isLoading={actionLoading === u.id}
                      >
                        {u.status === 'BANNED' ? (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Desbanir
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Banir
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === 'disputes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {disputes.length === 0 ? (
                <div className="py-12 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma disputa encontrada</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {disputes.map((d) => (
                    <div key={d.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {d.match?.player1?.username || '?'} vs {d.match?.player2?.username || '?'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.match?.tournament?.title} • Aberta por {d.creator?.username}
                          </p>
                        </div>
                        <Badge
                          variant={
                            d.status === 'OPEN' ? 'warning'
                            : d.status === 'RESOLVED' ? 'success'
                            : d.status === 'REJECTED' ? 'destructive'
                            : 'info'
                          }
                        >
                          {d.status === 'OPEN' ? 'Aberta' : d.status === 'RESOLVED' ? 'Resolvida' : d.status === 'REJECTED' ? 'Rejeitada' : d.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{d.reason}</p>
                      {d.resolution && (
                        <p className="text-sm text-gaming-green">Resolução: {d.resolution}</p>
                      )}
                      {(d.status === 'OPEN' || d.status === 'UNDER_REVIEW') && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveDispute(d.id, 'RESOLVED', 'Resolvida pelo admin')}
                            isLoading={actionLoading === d.id}
                          >
                            Resolver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => resolveDispute(d.id, 'REJECTED', 'Disputa rejeitada')}
                            isLoading={actionLoading === d.id}
                          >
                            Rejeitar
                          </Button>
                        </div>
                      )}
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
