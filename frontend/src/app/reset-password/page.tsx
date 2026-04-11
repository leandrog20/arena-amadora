'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '@/services/api'
import { useToastStore } from '@/stores/toast-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
      .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
      .regex(/[0-9]/, 'Deve conter ao menos um número')
      .regex(/[^A-Za-z0-9]/, 'Deve conter ao menos um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type ResetForm = z.infer<typeof resetSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const toast = useToastStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  if (!token) {
    return (
      <Card className="glass">
        <CardContent className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">Link inválido ou expirado.</p>
          <Link href="/forgot-password">
            <Button variant="gaming">Solicitar novo link</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  async function onSubmit(data: ResetForm) {
    setIsLoading(true)
    try {
      await api.post(
        '/auth/reset-password',
        { token, password: data.password },
        { requireAuth: false },
      )
      setSuccess(true)
      toast.success('Senha alterada!', 'Faça login com sua nova senha')
    } catch (error: any) {
      toast.error('Erro', error.message || 'Link inválido ou expirado')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="glass">
        <CardContent className="text-center py-12 space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <p className="font-semibold text-lg">Senha alterada com sucesso!</p>
          <Link href="/login">
            <Button variant="gaming" className="w-full mt-4">
              Ir para o login
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Nova Senha</CardTitle>
        <CardDescription>Crie uma nova senha para sua conta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nova senha"
              className="pl-10 pr-10"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar nova senha"
              className="pl-10"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </div>

          <Button
            type="submit"
            variant="gaming"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Redefinir senha
          </Button>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar ao login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  )
}
