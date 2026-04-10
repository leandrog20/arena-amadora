'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Team } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { useToastStore } from '@/stores/toast-store'
import {
  Users,
  Plus,
  Search,
  Shield,
  TrendingUp,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export default function TeamsPage() {
  const toast = useToastStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [form, setForm] = useState({ name: '', tag: '' })

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    setLoading(true)
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await api.get<{ data: Team[] }>(`/teams${params}`)
      setTeams(res.data)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.name || !form.tag) return
    setCreateLoading(true)
    try {
      await api.post('/teams', form)
      toast.success('Equipe criada com sucesso!')
      setShowCreate(false)
      setForm({ name: '', tag: '' })
      loadTeams()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar equipe')
    } finally {
      setCreateLoading(false)
    }
  }

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tag.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Equipes</h1>
          <p className="text-muted-foreground mt-1">Crie ou encontre equipes para competir</p>
        </div>
        <Button variant="gaming" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Equipe
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar equipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma equipe encontrada</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((team, i) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{team.name}</h3>
                      <Badge variant="outline">[{team.tag}]</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {team._count?.members || team.members?.length || 0} membros
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {team.eloRating} ELO
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-xl font-bold mb-4">Criar Equipe</Dialog.Title>
            <div className="space-y-4">
              <Input
                label="Nome da Equipe"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Team Alpha"
              />
              <Input
                label="Tag (sigla)"
                value={form.tag}
                onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value.toUpperCase().slice(0, 5) }))}
                placeholder="Ex: ALPHA"
                maxLength={5}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button variant="gaming" onClick={handleCreate} isLoading={createLoading}>
                  Criar
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
