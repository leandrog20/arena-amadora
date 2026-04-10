'use client'

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToastStore } from '@/stores/toast-store'
import { motion } from 'framer-motion'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface WalletData {
  balance: number
  frozenAmount: number
}

interface Transaction {
  id: string
  type: string
  amount: number
  description: string | null
  status: string
  createdAt: string
}

export default function WalletPage() {
  const toast = useToastStore()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function loadData() {
    try {
      const [wRes, tRes] = await Promise.all([
        api.get<{ data: WalletData }>('/wallet/balance'),
        api.get<{ data: Transaction[]; pagination: { totalPages: number } }>(
          `/wallet/transactions?page=${page}&limit=15`
        ),
      ])
      setWallet(wRes.data)
      setTransactions(tRes.data)
      setTotalPages(tRes.pagination?.totalPages || 1)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [page])

  async function handleAction() {
    const value = parseFloat(amount)
    if (!value || value <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    setActionLoading(true)
    try {
      if (tab === 'deposit') {
        await api.post('/wallet/deposit', { amount: value })
        toast.success(`Depósito de R$ ${value.toFixed(2)} realizado!`)
      } else {
        await api.post('/wallet/withdraw', { amount: value })
        toast.success(`Saque de R$ ${value.toFixed(2)} solicitado!`)
      }
      setAmount('')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro na operação')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Carteira</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu saldo</p>
      </motion.div>

      {/* Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gaming-green/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-gaming-green" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <p className="text-2xl font-bold text-gaming-green">
                R$ {Number(wallet?.balance || 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gaming-yellow/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-gaming-yellow" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Congelado</p>
              <p className="text-2xl font-bold text-gaming-yellow">
                R$ {Number(wallet?.frozenAmount || 0).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-gaming-purple/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-gaming-purple" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                R$ {(Number(wallet?.balance || 0) + Number(wallet?.frozenAmount || 0)).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deposit / Withdraw */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2 mb-4">
            <Button
              variant={tab === 'deposit' ? 'default' : 'outline'}
              onClick={() => setTab('deposit')}
            >
              <ArrowDownRight className="h-4 w-4 mr-2" />
              Depositar
            </Button>
            <Button
              variant={tab === 'withdraw' ? 'default' : 'outline'}
              onClick={() => setTab('withdraw')}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Sacar
            </Button>
          </div>
          <div className="flex gap-3 max-w-md">
            <Input
              type="number"
              min="1"
              step="0.01"
              placeholder="R$ 0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button variant="gaming" onClick={handleAction} isLoading={actionLoading}>
              {tab === 'deposit' ? 'Depositar' : 'Sacar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        ['DEPOSIT', 'PRIZE', 'REFUND'].includes(tx.type)
                          ? 'bg-gaming-green/10'
                          : 'bg-gaming-red/10'
                      }`}
                    >
                      {['DEPOSIT', 'PRIZE', 'REFUND'].includes(tx.type) ? (
                        <ArrowDownRight className="h-4 w-4 text-gaming-green" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-gaming-red" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        ['DEPOSIT', 'PRIZE', 'REFUND'].includes(tx.type)
                          ? 'text-gaming-green'
                          : 'text-gaming-red'
                      }`}
                    >
                      {['DEPOSIT', 'PRIZE', 'REFUND'].includes(tx.type) ? '+' : '-'} R${' '}
                      {Number(tx.amount).toFixed(2)}
                    </p>
                    <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'warning'} className="text-xs">
                      {tx.status === 'COMPLETED' ? 'Concluída' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
