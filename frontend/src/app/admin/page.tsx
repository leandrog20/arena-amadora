'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/services/api'
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
} from '@/components/ui/dialog'
import { useToastStore } from '@/stores/toast-store'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { AdminTournamentBracket } from '@/components/admin-tournament-bracket'
import {
  Shield,
  Users,
  Trophy,
  DollarSign,
  Ban,
  UserCheck,
  TrendingUp,
  Trash2,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Gamepad2,
  Search,
  ShieldCheck,
  ChevronDown,
  Zap,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ===== types =====

interface DashboardData {
  users: { total: number; activeToday: number }
  tournaments: {
    total: number
    active: number
    completed: number
    cancelled: number
    registration: number
  }
  revenue: {
    total: number
    last30Days: Array<{ date: string; total: number }>
    prizeDistributed: number
    totalDeposits: number
    totalWithdrawals: number
  }
  transactions: { total: number }
  charts: {
    revenueByDay: Array<{ date: string; total: number }>
    usersByDay: Array<{ date: string; count: number }>
    gamesByTournaments: Array<{ game: string; count: number }>
    gamesByParticipants: Array<{ game: string; participants: number }>
    tournamentsByStatus: Array<{ status: string; count: number }>
    monthlyFinancial: Array<{ month: string; invested: number; platformEarnings: number }>
  }
  recentUsers: Array<{
    id: string
    username: string
    email: string
    createdAt: string
    role: string
  }>
  recentTournaments: Array<{
    id: string
    title: string
    game: string
    status: string
    entryFee: number
    prizePool: number
    platformFee: number
    maxParticipants: number
    startDate: string
    createdAt: string
    _count: { participants: number }
  }>
}

interface AdminUser {
  id: string
  username: string
  displayName: string | null
  email: string
  role: string
  isBanned: boolean
  banReason: string | null
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

const PIE_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#ef4444']
const BAR_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444']

const statusLabelMap: Record<string, string> = {
  REGISTRATION: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
  DRAFT: 'Rascunho',
}

const statusVariantMap: Record<string, 'success' | 'info' | 'default' | 'destructive' | 'warning'> = {
  REGISTRATION: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'default',
  CANCELLED: 'destructive',
  DRAFT: 'warning',
}

const tooltipStyle = {
  backgroundColor: 'hsl(222.2 84% 4.9%)',
  border: '1px solid hsl(217.2 32.6% 17.5%)',
  borderRadius: '8px',
  color: '#fff',
}

export default function AdminPage() {
  const toast = useToastStore()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'tournaments' | 'users' | 'disputes'>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; title: string } | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [roleDialog, setRoleDialog] = useState<{ id: string; username: string; currentRole: string } | null>(null)
  const [bracketDialog, setBracketDialog] = useState<any>(null)

  const loadData = useCallback(async () => {
    try {
      const [dRes, uRes, diRes] = await Promise.all([
        api.get<{ data: DashboardData }>('/admin/dashboard', { cacheTtl: 5_000 }),
        api.get<{ data: AdminUser[] }>('/admin/users?limit=50', { cacheTtl: 5_000 }),
        api.get<{ data: { disputes: Dispute[] } }>('/disputes?limit=50', { cacheTtl: 5_000 }),
      ])
      setDashboard(dRes.data)
      setUsers(uRes.data)
      setDisputes(diRes.data?.disputes || [])
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function searchUsers(query: string) {
    setUserSearch(query)
    if (!query.trim()) {
      // Reload default list
      try {
        const res = await api.get<{ data: AdminUser[] }>('/admin/users?limit=50', { cacheTtl: 0 })
        setUsers(res.data)
      } catch {}
      return
    }
    setSearchLoading(true)
    try {
      const res = await api.get<{ data: AdminUser[] }>(`/admin/users?search=${encodeURIComponent(query)}&limit=50`, { cacheTtl: 0 })
      setUsers(res.data)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao buscar')
    } finally {
      setSearchLoading(false)
    }
  }

  async function changeRole(userId: string, role: 'USER' | 'ADMIN' | 'MODERATOR') {
    setActionLoading(userId)
    try {
      await api.patch(`/admin/users/${userId}/role`, { role })
      toast.success(`Permissão alterada para ${role}`)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      )
      setRoleDialog(null)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar permissão')
    } finally {
      setActionLoading(null)
    }
  }

  async function toggleBan(userId: string, isBanned: boolean) {
    setActionLoading(userId)
    try {
      if (isBanned) {
        await api.post(`/admin/users/${userId}/unban`)
        toast.success('Usuário desbanido')
      } else {
        await api.post(`/admin/users/${userId}/ban`, { reason: 'Violação dos termos' })
        toast.success('Usuário banido')
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isBanned: !isBanned } : u
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

  async function handleDeleteTournament() {
    if (!deleteDialog) return
    setActionLoading(deleteDialog.id)
    try {
      await api.delete(`/admin/tournaments/${deleteDialog.id}`)
      toast.success('Torneio excluído com sucesso')
      setDashboard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          recentTournaments: prev.recentTournaments.filter((t) => t.id !== deleteDialog.id),
          tournaments: {
            ...prev.tournaments,
            total: prev.tournaments.total - 1,
          },
        }
      })
      setDeleteDialog(null)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir torneio')
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
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { key: 'overview', label: 'Visão Geral', icon: BarChart3 },
          { key: 'tournaments', label: 'Torneios', icon: Trophy },
          { key: 'users', label: 'Usuários', icon: Users },
          { key: 'disputes', label: 'Disputas', icon: Shield },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {tab === 'overview' && dashboard && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Usuários</p>
                  <p className="text-2xl font-bold">{dashboard.users.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard.users.activeToday} ativos hoje
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Torneios</p>
                  <p className="text-2xl font-bold">{dashboard.tournaments.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {dashboard.tournaments.active} em andamento
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receita (Taxas)</p>
                  <p className="text-2xl font-bold">
                    R$ {Number(dashboard.revenue.total || 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transações</p>
                  <p className="text-2xl font-bold">{dashboard.transactions.total}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Depósitos</p>
                <p className="text-xl font-bold text-green-500">
                  R$ {Number(dashboard.revenue.totalDeposits || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Saques</p>
                <p className="text-xl font-bold text-red-500">
                  R$ {Number(dashboard.revenue.totalWithdrawals || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Prêmios Distribuídos</p>
                <p className="text-xl font-bold text-yellow-500">
                  R$ {Number(dashboard.revenue.prizeDistributed || 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Revenue + Users */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Receita (últimos 30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.charts.revenueByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dashboard.charts.revenueByDay}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#888' }}
                        tickFormatter={(v) => {
                          const d = new Date(v)
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                        formatter={((value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Receita']) as any}
                      />
                      <Area type="monotone" dataKey="total" stroke="#22c55e" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados de receita ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Users Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-blue-500" />
                  Novos Usuários (últimos 30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.charts.usersByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dashboard.charts.usersByDay}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#888' }}
                        tickFormatter={(v) => {
                          const d = new Date(v)
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}`
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(v) => new Date(v).toLocaleDateString('pt-BR')}
                        formatter={((value: any) => [value, 'Novos usuários']) as any}
                      />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados de registro ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Games + Tournament Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Games by Tournaments */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gamepad2 className="h-5 w-5 text-yellow-500" />
                  Jogos Mais Populares (por torneios)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.charts.gamesByTournaments.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dashboard.charts.gamesByTournaments} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                      <YAxis dataKey="game" type="category" width={120} tick={{ fontSize: 12, fill: '#888' }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={((value: any) => [value, 'Torneios']) as any} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {dashboard.charts.gamesByTournaments.map((_, i) => (
                          <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Sem torneios criados ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tournament Status Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="h-5 w-5 text-purple-500" />
                  Status dos Torneios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.charts.tournamentsByStatus.some((s) => s.count > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={dashboard.charts.tournamentsByStatus.filter((s) => s.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="status"
                      >
                        {dashboard.charts.tournamentsByStatus
                          .filter((s) => s.count > 0)
                          .map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Sem torneios
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Financial Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                Financeiro Mensal (últimos 12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.charts.monthlyFinancial.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dashboard.charts.monthlyFinancial}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#888' }}
                      tickFormatter={(v) => {
                        const [y, m] = v.split('-')
                        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
                        return `${months[parseInt(m) - 1]}/${y.slice(2)}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(v) => {
                        const [y, m] = v.split('-')
                        const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
                        return `${months[parseInt(m) - 1]} ${y}`
                      }}
                      formatter={((value: any, name: any) => [
                        `R$ ${Number(value).toFixed(2)}`,
                        name === 'invested' ? 'Investido em Torneios' : 'Ganho da Plataforma',
                      ]) as any}
                    />
                    <Legend
                      formatter={(value) => value === 'invested' ? 'Investido em Torneios' : 'Ganho da Plataforma'}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="invested" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="platformEarnings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados financeiros ainda
                </div>
              )}
            </CardContent>
          </Card>

          {/* Games by participants */}
          {dashboard.charts.gamesByParticipants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Jogos por Total de Inscrições
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboard.charts.gamesByParticipants}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217.2 32.6% 17.5%)" />
                    <XAxis dataKey="game" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={((value: any) => [value, 'Inscrições']) as any} />
                    <Bar dataKey="participants" radius={[4, 4, 0, 0]}>
                      {dashboard.charts.gamesByParticipants.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos Cadastros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {dashboard.recentUsers?.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.role === 'ADMIN' ? 'premium' : 'outline'} className="text-xs">
                        {u.role}
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

      {/* ====== TOURNAMENTS TAB ====== */}
      {tab === 'tournaments' && dashboard && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gerenciar Torneios</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dashboard.recentTournaments.length === 0 ? (
                <div className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum torneio cadastrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium">Torneio</th>
                        <th className="text-left p-3 font-medium">Jogo</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-right p-3 font-medium">Jogadores</th>
                        <th className="text-right p-3 font-medium">Premiação</th>
                        <th className="text-right p-3 font-medium">Taxa Plataf.</th>
                        <th className="text-right p-3 font-medium">Data</th>
                        <th className="text-center p-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.recentTournaments.map((t) => (
                        <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium max-w-[200px] truncate">{t.title}</td>
                          <td className="p-3">
                            <span className="flex items-center gap-1">
                              <Gamepad2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {t.game}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant={statusVariantMap[t.status] || 'default'}>
                              {statusLabelMap[t.status] || t.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">{t._count.participants}/{t.maxParticipants}</td>
                          <td className="p-3 text-right text-green-500 font-medium">R$ {Number(t.prizePool).toFixed(2)}</td>
                          <td className="p-3 text-right text-yellow-500 font-medium">R$ {Number(t.platformFee).toFixed(2)}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {new Date(t.startDate).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: '2-digit', year: '2-digit',
                            })}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {t.status === 'IN_PROGRESS' && (
                                <Button
                                  variant="gaming"
                                  size="sm"
                                  onClick={() => setBracketDialog(t)}
                                  title="Gerenciar chaveamento"
                                  className="flex items-center gap-1"
                                >
                                  <Zap className="h-4 w-4" />
                                  <span className="hidden sm:inline text-xs">Chaveamento</span>
                                </Button>
                              )}
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteDialog({ id: t.id, title: t.title })}
                                disabled={t.status === 'IN_PROGRESS'}
                                title={t.status === 'IN_PROGRESS' ? 'Não é possível excluir torneio em andamento' : 'Excluir torneio'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ====== USERS TAB ====== */}
      {tab === 'users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={userSearch}
              onChange={(e) => searchUsers(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {users.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {userSearch ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                  </p>
                </div>
              ) : (
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
                      <div className="flex items-center gap-2">
                        {/* Role badge — click to change */}
                        <button
                          onClick={() => setRoleDialog({ id: u.id, username: u.displayName || u.username, currentRole: u.role })}
                          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                          title="Alterar permissão"
                        >
                          <Badge variant={u.role === 'ADMIN' ? 'premium' : u.role === 'MODERATOR' ? 'info' : 'outline'}>
                            {u.role === 'ADMIN' && <ShieldCheck className="h-3 w-3 mr-1" />}
                            {u.role}
                          </Badge>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>

                        <Badge variant={u.isBanned ? 'destructive' : 'success'}>
                          {u.isBanned ? 'BANIDO' : 'ATIVO'}
                        </Badge>
                        <Button
                          variant={u.isBanned ? 'outline' : 'destructive'}
                          size="sm"
                          onClick={() => toggleBan(u.id, u.isBanned)}
                          isLoading={actionLoading === u.id}
                        >
                          {u.isBanned ? (
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
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ====== DISPUTES TAB ====== */}
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
                        <p className="text-sm text-green-500">Resolução: {d.resolution}</p>
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

      {/* Role Change Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={(open) => !open && setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Alterar permissão de <strong>{roleDialog?.username}</strong>:
          </p>
          <div className="flex flex-col gap-2 pt-2">
            {(['USER', 'MODERATOR', 'ADMIN'] as const).map((role) => (
              <Button
                key={role}
                variant={roleDialog?.currentRole === role ? 'default' : 'outline'}
                className="justify-start gap-2"
                disabled={roleDialog?.currentRole === role}
                isLoading={actionLoading === roleDialog?.id}
                onClick={() => roleDialog && changeRole(roleDialog.id, role)}
              >
                {role === 'ADMIN' && <ShieldCheck className="h-4 w-4" />}
                {role === 'MODERATOR' && <Shield className="h-4 w-4" />}
                {role === 'USER' && <Users className="h-4 w-4" />}
                {role}
                {roleDialog?.currentRole === role && (
                  <span className="text-xs text-muted-foreground ml-auto">(atual)</span>
                )}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Torneio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o torneio <strong>{deleteDialog?.title}</strong>?
            Esta ação não pode ser desfeita. Todos os participantes inscritos serão reembolsados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTournament}
              isLoading={actionLoading === deleteDialog?.id}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tournament Bracket Manager */}
      {bracketDialog && (
        <AdminTournamentBracket
          tournament={bracketDialog}
          isOpen={!!bracketDialog}
          onClose={() => setBracketDialog(null)}
        />
      )}
    </div>
  )
}
