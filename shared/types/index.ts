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

export type ScoringType = 'SCOREBOARD' | 'WIN_LOSE'

export interface GameItem {
  id: string
  igdbId: number | null
  name: string
  coverUrl: string | null
  genres: string | null
  summary: string | null
  minRamGb: number
  minVramGb: number
  minGpuTier: number
  minCpuTier: number
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

export interface TournamentGameItem {
  id: string
  tournamentId: string
  gameId: string
  scoringType: ScoringType
  order: number
  game: GameItem
  rounds: TournamentRoundItem[]
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
  }>
}
