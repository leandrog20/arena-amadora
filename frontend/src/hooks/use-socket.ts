'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth-store'
import { queryKeys } from './use-queries'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3333'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
      return
    }

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    // Notificações em tempo real
    socket.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    })

    // Atualização de match em tempo real
    socket.on('match:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }
  }, [isAuthenticated, queryClient])

  const joinTournament = useCallback((tournamentId: string) => {
    socketRef.current?.emit('tournament:join', tournamentId)
  }, [])

  const leaveTournament = useCallback((tournamentId: string) => {
    socketRef.current?.emit('tournament:leave', tournamentId)
  }, [])

  const sendMessage = useCallback((tournamentId: string, content: string) => {
    socketRef.current?.emit('tournament:message', { tournamentId, content })
  }, [])

  const subscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('match:subscribe', matchId)
  }, [])

  const unsubscribeMatch = useCallback((matchId: string) => {
    socketRef.current?.emit('match:unsubscribe', matchId)
  }, [])

  const onEvent = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler)
    return () => {
      socketRef.current?.off(event, handler)
    }
  }, [])

  return {
    socket: socketRef.current,
    isConnected,
    joinTournament,
    leaveTournament,
    sendMessage,
    subscribeMatch,
    unsubscribeMatch,
    onEvent,
  }
}
