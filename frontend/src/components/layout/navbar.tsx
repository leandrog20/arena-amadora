'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Swords,
  Users,
  Wallet,
  Bell,
  LogOut,
  User,
  BarChart3,
  Shield,
  Menu,
  X,
  Gamepad2,
} from 'lucide-react'
import { memo, useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/tournaments', label: 'Torneios', icon: Trophy },
  { href: '/matches', label: 'Partidas', icon: Swords },
  { href: '/rankings', label: 'Rankings', icon: BarChart3 },
  { href: '/teams', label: 'Equipes', icon: Users },
  { href: '/wallet', label: 'Carteira', icon: Wallet },
]

export function Navbar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gradient">Arena Amadora</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated && navItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="relative"
                  >
                    <item.icon className="h-4 w-4 mr-1.5" />
                    {item.label}
                    {isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full transition-all"
                      />
                    )}
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/profile" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-gaming-purple to-gaming-blue flex items-center justify-center text-xs font-bold text-white">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-sm font-medium">{user?.displayName || user?.username}</p>
                    <div className="flex items-center gap-1">
                      <Badge variant="info" className="text-[10px] px-1.5 py-0">
                        Lvl {user?.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {user?.eloRating} ELO
                      </span>
                    </div>
                  </div>
                </Link>

                {user?.role === 'ADMIN' && (
                  <Link href="/admin">
                    <Button variant="ghost" size="icon">
                      <Shield className="h-5 w-5 text-gaming-yellow" />
                    </Button>
                  </Link>
                )}

                <Button variant="ghost" size="icon" onClick={() => logout()}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Entrar</Button>
                </Link>
                <Link href="/register">
                  <Button variant="gaming">Criar Conta</Button>
                </Link>
              </div>
            )}

            {/* Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && isAuthenticated && (
          <div
            className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export const MemoizedNavbar = memo(Navbar)
