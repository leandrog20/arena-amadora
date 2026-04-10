export interface User {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  bio: string | null
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  xp: number
  level: number
  eloRating: number
  gamesPlayed: number
  gamesWon: number
  winStreak: number
  bestWinStreak: number
  isVerified: boolean
  createdAt: string
}

export interface Tournament {
  id: string
  title: string
  description: string | null
  game: string
  format: 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION' | 'ROUND_ROBIN'
  status: 'DRAFT' | 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  maxParticipants: number
  minParticipants: number
  entryFee: number
  prizePool: number
  platformFee: number
  feePercentage: number
  rules: string | null
  bannerUrl: string | null
  isTeamBased: boolean
  teamSize: number | null
  startDate: string
  endDate: string | null
  registrationEnd: string | null
  currentRound: number
  totalRounds: number
  createdById: string
  createdBy?: { id: string; username: string; displayName: string; avatarUrl: string | null }
  participants?: Participant[]
  matches?: Match[]
  _count?: { participants: number; matches: number }
  createdAt: string
}

export interface Participant {
  id: string
  userId: string
  tournamentId: string
  teamId: string | null
  seed: number | null
  placement: number | null
  isEliminated: boolean
  isCheckedIn: boolean
  status?: 'ACTIVE' | 'ELIMINATED' | 'WINNER'
  user?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    eloRating: number
  }
}

export interface Match {
  id: string
  tournamentId: string
  round: number
  position: number
  player1Id: string | null
  player2Id: string | null
  winnerId: string | null
  player1Score: number | null
  player2Score: number | null
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'
  proofUrl: string | null
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  player1?: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  player2?: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  winner?: { id: string; username: string }
  tournament?: { id: string; title: string; game: string; format: string }
}

export interface Wallet {
  id: string
  balance: number
  frozenAmount: number
  updatedAt: string
}

export interface Transaction {
  id: string
  walletId: string
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TOURNAMENT_ENTRY' | 'TOURNAMENT_PRIZE' | 'PLATFORM_FEE' | 'REFUND'
  amount: number
  balanceBefore: number
  balanceAfter: number
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  description: string | null
  createdAt: string
}

export interface Notification {
  id: string
  type: 'TOURNAMENT' | 'MATCH' | 'SOCIAL' | 'SYSTEM' | 'PAYMENT' | 'ACHIEVEMENT'
  title: string
  message: string
  content?: string
  data: unknown
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface Team {
  id: string
  name: string
  tag: string
  description: string | null
  logoUrl: string | null
  ownerId: string
  eloRating: number
  members?: TeamMember[]
  _count?: { members: number }
}

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: string
  user?: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
