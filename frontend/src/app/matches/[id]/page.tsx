'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { api } from '@/services/api'
import { Match, Tournament, User } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Trophy,
  Crown,
  AlertCircle,
  CheckCircle,
  Swords,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface MatchDetail extends Match {
  tournament?: Tournament
  player1?: User
  player2?: User
  winner?: User
  disputes?: Array<{
    id: string
    status: string
  }>
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info' }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'info' },
  COMPLETED: { label: 'Finalizada', variant: 'success' },
  DISPUTED: { label: 'Em Disputa', variant: 'destructive' },
  CANCELLED: { label: 'Cancelada', variant: 'secondary' },
}

export default function MatchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const toast = useToastStore()

  const matchId = params.id as string
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reportDialog, setReportDialog] = useState(false)
  const [reportData, setReportData] = useState({
    player1Score: '',
    player2Score: '',
    winnerId: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [proofUrl, setProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)

  useEffect(() => {
    loadMatch()
  }, [matchId])

  async function loadMatch() {
    setLoading(true)
    try {
      const res = await api.get<{ data: MatchDetail }>(`/matches/${matchId}`)
      setMatch(res.data)
    } catch (err: any) {
      toast.error('Partida não encontrada')
      router.push('/tournaments')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitResult() {
    if (!reportData.player1Score || !reportData.player2Score || !reportData.winnerId) {
      toast.error('Preencha todos os campos')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/matches/${matchId}/result`, {
        player1Score: parseInt(reportData.player1Score),
        player2Score: parseInt(reportData.player2Score),
        winnerId: reportData.winnerId,
      })
      toast.success('Resultado reportado com sucesso!')
      setReportDialog(false)
      await loadMatch()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reportar resultado')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUploadProof() {
    if (!proofUrl.trim()) {
      toast.error('Adicione um URL de prova')
      return
    }

    setUploadingProof(true)
    try {
      await api.post(`/matches/${matchId}/proof`, { proofUrl })
      toast.success('Prova enviada com sucesso!')
      setProofUrl('')
      await loadMatch()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar prova')
    } finally {
      setUploadingProof(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold">Partida não encontrada</h2>
        <Link href="/tournaments">
          <Button variant="outline" className="mt-4">
            Voltar aos torneios
          </Button>
        </Link>
      </div>
    )
  }

  const isParticipant = user && (match.player1Id === user.id || match.player2Id === user.id)
  const isPlayer1 = user?.id === match.player1Id
  const canReportResult = isParticipant && match.status !== 'COMPLETED'

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href={match.tournament ? `/tournaments/${match.tournament.id}` : '/tournaments'} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Voltar ao torneio
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant={statusMap[match.status]?.variant || 'default'}>
                    {statusMap[match.status]?.label || match.status}
                  </Badge>
                  {match.tournament && (
                    <p className="text-sm text-muted-foreground mt-2">{match.tournament.title}</p>
                  )}
                </div>
              </div>

              {/* Match */}
              <div className="space-y-3">
                {/* Player 1 */}
                <div className={`p-4 rounded-lg border ${match.winnerId === match.player1Id ? 'bg-gaming-green/10 border-gaming-green/30' : 'bg-card border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(match.player1?.displayName || match.player1?.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{match.player1?.displayName || match.player1?.username || 'Aguardando'}</p>
                        <p className="text-xs text-muted-foreground">ELO: {match.player1?.eloRating || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {match.player1Score !== null && (
                        <p className="text-2xl font-bold">{match.player1Score}</p>
                      )}
                      {match.winnerId === match.player1Id && (
                        <Badge variant="gaming" className="mt-2">
                          <Crown className="h-3 w-3 mr-1" />
                          Vencedor
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* VS */}
                <div className="flex justify-center">
                  <Swords className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Player 2 */}
                <div className={`p-4 rounded-lg border ${match.winnerId === match.player2Id ? 'bg-gaming-green/10 border-gaming-green/30' : 'bg-card border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {(match.player2?.displayName || match.player2?.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{match.player2?.displayName || match.player2?.username || 'Aguardando'}</p>
                        <p className="text-xs text-muted-foreground">ELO: {match.player2?.eloRating || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {match.player2Score !== null && (
                        <p className="text-2xl font-bold">{match.player2Score}</p>
                      )}
                      {match.winnerId === match.player2Id && (
                        <Badge variant="gaming" className="mt-2">
                          <Crown className="h-3 w-3 mr-1" />
                          Vencedor
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Rodada</p>
                  <p className="font-semibold">Rodada {match.round}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusMap[match.status]?.variant || 'default'} className="text-xs">
                    {statusMap[match.status]?.label || match.status}
                  </Badge>
                </div>
                {match.completedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Finalizada em</p>
                    <p className="font-semibold text-xs">
                      {new Date(match.completedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Proof */}
      {match.proofUrl && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Prova da Partida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a href={match.proofUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <LinkIcon className="h-4 w-4" />
                Ver prova
              </a>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Actions */}
      {canReportResult && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => setReportDialog(true)} variant="gaming" className="w-full">
                <Trophy className="h-4 w-4 mr-2" />
                Reportar Resultado
              </Button>

              {!match.proofUrl && (
                <div className="space-y-2 pt-4 border-t border-border">
                  <p className="text-sm font-medium">Enviar Prova</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="URL da prova (print, vídeo, etc)"
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                    />
                    <Button onClick={handleUploadProof} variant="outline" isLoading={uploadingProof}>
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Report Result Dialog */}
      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Resultado</DialogTitle>
            <DialogDescription>Informe o placar final da partida</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{match.player1?.username}</label>
              <Input
                type="number"
                min="0"
                value={reportData.player1Score}
                onChange={(e) => setReportData({ ...reportData, player1Score: e.target.value })}
                placeholder="Pontos"
              />
            </div>

            <div>
              <label className="text-sm font-medium">{match.player2?.username}</label>
              <Input
                type="number"
                min="0"
                value={reportData.player2Score}
                onChange={(e) => setReportData({ ...reportData, player2Score: e.target.value })}
                placeholder="Pontos"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Vencedor</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={reportData.winnerId === match.player1Id ? 'gaming' : 'outline'}
                  onClick={() => setReportData({ ...reportData, winnerId: match.player1Id || '' })}
                >
                  {match.player1?.username}
                </Button>
                <Button
                  variant={reportData.winnerId === match.player2Id ? 'gaming' : 'outline'}
                  onClick={() => setReportData({ ...reportData, winnerId: match.player2Id || '' })}
                >
                  {match.player2?.username}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitResult} isLoading={submitting} variant="gaming">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reportando...
                </>
              ) : (
                'Reportar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
