export interface RigSpecs {
  cpuModel: string
  cpuTier: number    // 1 to 10
  gpuModel: string
  gpuTier: number    // 1 to 10
  vramGb: number
  ramGb: number
  os?: string
}

export interface GameRequirements {
  minRamGb: number
  minVramGb: number
  minGpuTier: number // 1 to 10
  minCpuTier: number // 1 to 10
}

export type CompatibilityStatus = 'READY' | 'WARNING' | 'INSUFFICIENT'

export interface ComponentCheck {
  passed: boolean
  label: string
  required: number | string
  current: number | string
  unit?: string
  severity: 'OK' | 'WARN' | 'FAIL'
}

export interface CompatibilityResult {
  compatible: boolean
  status: CompatibilityStatus
  scorePercent: number // 0 to 100%
  bottlenecks: string[]
  details: {
    ram: ComponentCheck
    vram: ComponentCheck
    gpu: ComponentCheck
    cpu: ComponentCheck
  }
}

export interface ParticipantWithRig {
  id: string
  name: string
  avatar: string | null
  seatNumber: string | null
  rig: {
    id: string
    cpuModel: string
    cpuTier: number
    gpuModel: string
    gpuTier: number
    vramGb: number
    ramGb: number
    os: string
    notes?: string | null
  } | null
}

export type ScoringType = 'SCOREBOARD' | 'WIN_LOSE' | 'ROUND_ROBIN'

export type AcquisitionType = 'STORE_BUY' | 'FREE_TO_PLAY' | 'FRIEND_SHARE'

export type PriceSource = 'FREE_TO_PLAY' | 'FRIEND_SHARE' | 'STEAM' | 'KEYSHOP' | 'UNAVAILABLE'

export interface EffectivePrice {
  is_free: boolean
  display_price: string
  raw_cents: number | null
  currency: string
  source: PriceSource
  source_label: string
  steam_price_formatted?: string | null
  keyshop_price_formatted?: string | null
  savings_cents?: number | null
  savings_percent?: number | null
  friend_download_url?: string | null
  last_updated?: string | null
}

export interface GameItem {
  id: string
  igdbId: number | null
  name: string
  slug?: string
  coverUrl: string | null
  genres: string | null
  summary: string | null
  steamAppId?: string | null
  minRamGb: number
  recRamGb?: number
  minVramGb: number
  recVramGb?: number
  minGpuScore?: number
  recGpuScore?: number
  minCpuScore?: number
  recCpuScore?: number
  minGpuTier?: number
  minCpuTier?: number
  // Pricing fields
  steamPriceCents?: number | null
  keyshopPriceCents?: number | null
  currency?: string
  priceUpdatedAt?: string | Date | null
  acquisitionType?: AcquisitionType | string
  friendDownloadUrl?: string | null
}

export interface RoundScoreItem {
  id?: string
  participantId: string
  isWinner?: boolean | null
  rank?: number | null
  rawScore?: number | null
  points: number
}

export interface TournamentRoundItem {
  id: string
  tournamentGameId: string
  roundNumber: number
  name?: string | null
  createdAt?: string
  scores: RoundScoreItem[]
}

export interface TournamentTeamMemberItem {
  id: string
  nickname: string
  avatarUrl?: string | null
  rig?: { gpuName?: string } | null
}

export interface TournamentTeamItem {
  id: string
  tournamentGameId: string
  name: string
  seed: number
  members: TournamentTeamMemberItem[]
  createdAt?: string
}

export interface TournamentMatchItem {
  id: string
  tournamentGameId: string
  roundNumber: number
  matchNumber: number
  player1Id?: string | null
  player1?: {
    id: string
    nickname: string
    avatarUrl?: string | null
    rig?: { gpuName?: string } | null
  } | null
  player2Id?: string | null
  player2?: {
    id: string
    nickname: string
    avatarUrl?: string | null
    rig?: { gpuName?: string } | null
  } | null
  team1Id?: string | null
  team1?: TournamentTeamItem | null
  team2Id?: string | null
  team2?: TournamentTeamItem | null
  player1Score?: number | null
  player2Score?: number | null
  winnerId?: string | null
  winnerTeamId?: string | null
  isDraw: boolean
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  createdAt?: string
  updatedAt?: string
}

export interface RoundRobinStanding {
  participantId?: string
  participantName?: string
  avatar?: string | null
  seatNumber?: string | null
  teamId?: string
  teamName?: string
  teamMembers?: TournamentTeamMemberItem[]
  played: number
  wins: number
  draws: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  points: number
  rank: number
  tournamentPoints: number
}

export interface TournamentGameItem {
  id: string
  tournamentId: string
  gameId: string
  scoringType: ScoringType
  teamSize?: number
  order: number
  game: GameItem
  rounds: TournamentRoundItem[]
  matches?: TournamentMatchItem[]
  teams?: TournamentTeamItem[]
}

export interface TournamentWithDetails {
  id: string
  name: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED'
  scoringRules: number[]
  tournamentGames: TournamentGameItem[]
  games: GameItem[]
}

export interface LeaderboardEntry {
  participantId: string
  participantName: string
  avatar: string | null
  seatNumber: string | null
  totalPoints: number
  globalRank: number
  gameScores: Record<string, {
    scoringType: ScoringType
    tournamentPoints: number
    gameRank: number | null
    rawRoundPoints: number
    roundsCount: number
    roundDetails: {
      roundNumber: number
      isWinner?: boolean | null
      rank?: number | null
      rawScore?: number | null
      points: number
    }[]
    roundRobinStats?: {
      played: number
      wins: number
      draws: number
      losses: number
      scoreDiff: number
      rrPoints: number
    }
  }>
}

