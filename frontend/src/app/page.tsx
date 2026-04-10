'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Trophy, Swords, Users, Wallet, Zap, Shield } from 'lucide-react'

const features = [
  {
    icon: Trophy,
    title: 'Torneios Competitivos',
    description: 'Participe de torneios com premiação em dinheiro.',
  },
  {
    icon: Swords,
    title: 'Matchmaking Inteligente',
    description: 'Sistema ELO para partidas equilibradas.',
  },
  {
    icon: Users,
    title: 'Equipes & Clãs',
    description: 'Crie ou junte-se a equipes e compita em grupo.',
  },
  {
    icon: Wallet,
    title: 'Carteira Segura',
    description: 'Deposite, ganhe prêmios e saque com segurança.',
  },
  {
    icon: Zap,
    title: 'Tempo Real',
    description: 'Atualizações ao vivo de partidas e chat.',
  },
  {
    icon: Shield,
    title: 'Anti-Fraude',
    description: 'Sistema robusto de verificação e disputas.',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold mb-6">
            A Arena é{' '}
            <span className="text-gradient">Sua</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Compete em torneios, ganhe prêmios em dinheiro e prove que você é o melhor.
            Ranking ELO, equipes, conquistas e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button variant="gaming" size="lg" className="text-lg px-8">
                Comece Agora
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="outline" size="lg" className="text-lg px-8">
                Ver Torneios
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-4">
            Por que escolher a <span className="text-gradient">Arena Amadora</span>?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Uma plataforma completa para jogadores competitivos
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="rounded-2xl bg-gradient-to-r from-primary/20 via-gaming-blue/20 to-gaming-cyan/20 border border-primary/30 p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Pronto para competir?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Junte-se a milhares de jogadores e entre na arena agora mesmo.
          </p>
          <Link href="/register">
            <Button variant="gaming" size="lg">
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
