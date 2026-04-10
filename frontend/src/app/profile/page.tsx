'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useToastStore } from '@/stores/toast-store'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { User, Lock, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const profileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres').max(30),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Obrigatório'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Precisa de uma maiúscula')
      .regex(/[0-9]/, 'Precisa de um número')
      .regex(/[^A-Za-z0-9]/, 'Precisa de um caractere especial'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore()
  const toast = useToastStore()
  const [loading, setLoading] = useState(false)

  const {
    register: regProfile,
    handleSubmit: submitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '' },
  })

  const {
    register: regPassword,
    handleSubmit: submitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user) {
      resetProfile({ displayName: user.displayName || '' })
    }
  }, [user, resetProfile])

  async function onProfileSubmit(data: ProfileForm) {
    setLoading(true)
    try {
      await api.patch('/users/me', data)
      await fetchUser()
      toast.success('Perfil atualizado!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function onPasswordSubmit(data: PasswordForm) {
    setLoading(true)
    try {
      await api.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Senha alterada com sucesso!')
      resetPassword()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações</p>
      </motion.div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitProfile(onProfileSubmit)} className="space-y-4">
            <Input label="Username" value={user.username} disabled />
            <Input label="Email" value={user.email} disabled />
            <Input
              label="Nome de Exibição"
              {...regProfile('displayName')}
              error={profileErrors.displayName?.message}
            />
            <Button type="submit" isLoading={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitPassword(onPasswordSubmit)} className="space-y-4">
            <Input
              label="Senha Atual"
              type="password"
              {...regPassword('currentPassword')}
              error={passwordErrors.currentPassword?.message}
            />
            <Input
              label="Nova Senha"
              type="password"
              {...regPassword('newPassword')}
              error={passwordErrors.newPassword?.message}
            />
            <Input
              label="Confirmar Nova Senha"
              type="password"
              {...regPassword('confirmPassword')}
              error={passwordErrors.confirmPassword?.message}
            />
            <Button type="submit" isLoading={loading}>
              <Lock className="h-4 w-4 mr-2" />
              Alterar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
