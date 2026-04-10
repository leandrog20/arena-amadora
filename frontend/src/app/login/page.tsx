'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { usePrefetch } from '@/hooks/use-prefetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Gamepad2, Mail, Lock } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const toast = useToastStore()
  const { prefetchAfterLogin } = usePrefetch()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    try {
      await login(data.email, data.password)
      // Prefetch rotas + dados críticos enquanto o toast aparece
      prefetchAfterLogin()
      toast.success('Bem-vindo de volta!', 'Login realizado com sucesso')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error('Erro ao entrar', error.message || 'Verifique suas credenciais')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Entrar na Arena</CardTitle>
            <CardDescription>
              Entre com sua conta para competir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  className="pl-10"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <Button
                type="submit"
                variant="gaming"
                className="w-full"
                size="lg"
                isLoading={isLoading}
              >
                Entrar
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Criar conta
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
