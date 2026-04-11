'use client'

import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { useToastStore } from '@/stores/toast-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import {
  Users,
  UserPlus,
  UserMinus,
  Check,
  X,
  Ban,
  Search,
} from 'lucide-react'
import Link from 'next/link'

interface Friend {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  eloRating: number
  level: number
}

interface PendingRequest {
  id: string
  sender: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  createdAt: string
}

export default function SocialPage() {
  const toast = useToastStore()
  const [tab, setTab] = useState<'friends' | 'pending' | 'blocked' | 'add'>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [blocked, setBlocked] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [username, setUsername] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [fRes, pRes, bRes] = await Promise.all([
        api.get<{ data: Friend[] }>('/social/friends'),
        api.get<{ data: PendingRequest[] }>('/social/friends/pending'),
        api.get<{ data: Friend[] }>('/social/blocked'),
      ])
      setFriends(fRes.data)
      setPending(pRes.data)
      setBlocked(bRes.data)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) return
    setActionLoading('send')
    try {
      await api.post('/social/friends/request', { username: username.trim() })
      toast.success('Solicitação enviada!')
      setUsername('')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar solicitação')
    } finally {
      setActionLoading(null)
    }
  }

  async function respondRequest(requestId: string, accept: boolean) {
    setActionLoading(requestId)
    try {
      await api.post(`/social/friends/request/${requestId}/respond`, { accept })
      toast.success(accept ? 'Amizade aceita!' : 'Solicitação rejeitada')
      setPending((prev) => prev.filter((p) => p.id !== requestId))
      if (accept) loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setActionLoading(null)
    }
  }

  async function removeFriend(friendId: string) {
    setActionLoading(friendId)
    try {
      await api.delete(`/social/friends/${friendId}`)
      setFriends((prev) => prev.filter((f) => f.id !== friendId))
      toast.success('Amizade removida')
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setActionLoading(null)
    }
  }

  async function blockUser(userId: string) {
    setActionLoading(`block-${userId}`)
    try {
      await api.post(`/social/block/${userId}`)
      setFriends((prev) => prev.filter((f) => f.id !== userId))
      toast.success('Usuário bloqueado')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro')
    } finally {
      setActionLoading(null)
    }
  }

  async function unblockUser(userId: string) {
    setActionLoading(`unblock-${userId}`)
    try {
      await api.delete(`/social/block/${userId}`)
      setBlocked((prev) => prev.filter((b) => b.id !== userId))
      toast.success('Usuário desbloqueado')
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
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-gaming-blue" />
          Amigos
        </h1>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'friends', label: `Amigos (${friends.length})` },
          { key: 'pending', label: `Pendentes (${pending.length})` },
          { key: 'blocked', label: 'Bloqueados' },
          { key: 'add', label: 'Adicionar' },
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

      {tab === 'friends' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {friends.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum amigo ainda</p>
                  <Button variant="outline" className="mt-3" onClick={() => setTab('add')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar amigo
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {friends.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-4">
                      <Link href={`/profile/${f.username}`} className="flex items-center gap-3 hover:opacity-80">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(f.displayName || f.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{f.displayName || f.username}</p>
                          <p className="text-xs text-muted-foreground">
                            ELO {f.eloRating} • Nível {f.level}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => blockUser(f.id)}
                          isLoading={actionLoading === `block-${f.id}`}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFriend(f.id)}
                          isLoading={actionLoading === f.id}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
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

      {tab === 'pending' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {(p.sender.displayName || p.sender.username)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{p.sender.displayName || p.sender.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="gaming"
                          size="sm"
                          onClick={() => respondRequest(p.id, true)}
                          isLoading={actionLoading === p.id}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Aceitar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => respondRequest(p.id, false)}
                          isLoading={actionLoading === p.id}
                        >
                          <X className="h-4 w-4" />
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

      {tab === 'blocked' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="p-0">
              {blocked.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhum usuário bloqueado</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {blocked.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-sm font-bold text-destructive">
                          {(b.displayName || b.username)[0].toUpperCase()}
                        </div>
                        <p className="font-medium">{b.displayName || b.username}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => unblockUser(b.id)}
                        isLoading={actionLoading === `unblock-${b.id}`}
                      >
                        Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {tab === 'add' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Amigo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendRequest} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nome de usuário..."
                    className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button type="submit" variant="gaming" isLoading={actionLoading === 'send'}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
