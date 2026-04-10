'use client'

import { useRouter } from 'next/navigation'
import { useToastStore } from '@/stores/toast-store'
import { useCreateTournament } from '@/hooks/use-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Trophy, ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'

const createTournamentSchema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  game: z.string().min(1, 'Obrigatório').max(100),
  description: z.string().max(2000).optional().or(z.literal('')),
  format: z.enum(['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN']),
  maxParticipants: z.coerce.number().min(2, 'Mínimo 2').max(256, 'Máximo 256'),
  minParticipants: z.coerce.number().min(2).optional(),
  entryFee: z.coerce.number().min(0).optional(),
  rules: z.string().max(5000).optional().or(z.literal('')),
  startDate: z.string().min(1, 'Obrigatório'),
  endDate: z.string().optional().or(z.literal('')),
  registrationEnd: z.string().optional().or(z.literal('')),
})

type FormData = z.infer<typeof createTournamentSchema>

const formatOptions = [
  { value: 'SINGLE_ELIMINATION', label: 'Eliminatória Simples' },
  { value: 'DOUBLE_ELIMINATION', label: 'Eliminatória Dupla' },
  { value: 'ROUND_ROBIN', label: 'Todos contra Todos' },
]

export default function CreateTournamentPage() {
  const router = useRouter()
  const toast = useToastStore()
  const createMutation = useCreateTournament()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      format: 'SINGLE_ELIMINATION',
      maxParticipants: 8,
      minParticipants: 2,
      entryFee: 0,
    },
  })

  async function onSubmit(data: FormData) {
    try {
      const body: Record<string, unknown> = {
        title: data.title,
        game: data.game,
        format: data.format,
        maxParticipants: data.maxParticipants,
        minParticipants: data.minParticipants || 2,
        entryFee: data.entryFee || 0,
        startDate: new Date(data.startDate).toISOString(),
      }
      if (data.description) body.description = data.description
      if (data.rules) body.rules = data.rules
      if (data.endDate) body.endDate = new Date(data.endDate).toISOString()
      if (data.registrationEnd) body.registrationEnd = new Date(data.registrationEnd).toISOString()

      // Prefetch a rota de torneios enquanto a API processa
      router.prefetch('/tournaments')

      const res = await createMutation.mutateAsync(body)
      toast.success('Torneio criado com sucesso!')
      router.push(`/tournaments/${res.data.id}`)
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar torneio')
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link
        href="/tournaments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos torneios
      </Link>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-gaming-yellow" />
              Criar Torneio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Info básica */}
              <Input
                label="Nome do Torneio *"
                placeholder="Ex: Copa Arena Amadora - CS2"
                {...register('title')}
                error={errors.title?.message}
              />

              <Input
                label="Jogo *"
                placeholder="Ex: CS2, Valorant, League of Legends..."
                {...register('game')}
                error={errors.game?.message}
              />

              <div>
                <label className="block text-sm font-medium mb-1.5">Descrição</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  placeholder="Descreva o torneio..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                />
              </div>

              {/* Formato */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Formato *</label>
                <select
                  {...register('format')}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {formatOptions.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Participantes */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Máx. Participantes *"
                  type="number"
                  min={2}
                  max={256}
                  {...register('maxParticipants')}
                  error={errors.maxParticipants?.message}
                />
                <Input
                  label="Mín. Participantes"
                  type="number"
                  min={2}
                  {...register('minParticipants')}
                />
              </div>

              {/* Taxa */}
              <Input
                label="Taxa de Inscrição (R$)"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00 (gratuito)"
                {...register('entryFee')}
              />

              {/* Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Data de Início *"
                  type="datetime-local"
                  {...register('startDate')}
                  error={errors.startDate?.message}
                />
                <Input
                  label="Data de Término"
                  type="datetime-local"
                  {...register('endDate')}
                />
              </div>

              <Input
                label="Encerramento das Inscrições"
                type="datetime-local"
                {...register('registrationEnd')}
              />

              {/* Regras */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Regras</label>
                <textarea
                  {...register('rules')}
                  rows={4}
                  placeholder="Descreva as regras do torneio..."
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
                />
              </div>

              <Button type="submit" variant="gaming" className="w-full" isLoading={createMutation.isPending}>
                <Trophy className="h-4 w-4 mr-2" />
                Criar Torneio
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
