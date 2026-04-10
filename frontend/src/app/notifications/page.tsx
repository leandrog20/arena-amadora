'use client'

import { useNotifications, useMarkAllRead, useMarkRead } from '@/hooks/use-queries'
import { Notification } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck } from 'lucide-react'

export default function NotificationsPage() {
  const { data: res, isLoading: loading } = useNotifications()
  const markAllReadMutation = useMarkAllRead()
  const markReadMutation = useMarkRead()

  const notifications: Notification[] = res?.data?.notifications || []

  function markAllRead() {
    markAllReadMutation.mutate()
  }

  function markRead(id: string) {
    markReadMutation.mutate(id)
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Todas lidas'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        )}
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma notificação</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
              <Card
                key={n.id}
                className={`transition-colors ${
                  !n.readAt ? 'border-primary/30 bg-primary/5' : ''
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.readAt ? 'font-semibold' : ''}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {!n.readAt && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
          ))}
        </div>
      )}
    </div>
  )
}
