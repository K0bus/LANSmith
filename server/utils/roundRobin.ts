/**
 * Round-Robin (Berger / Polygon) pairing, team draft and standings calculation utilities.
 */

export interface RoundRobinMatchPlan {
  roundNumber: number
  matchNumber: number
  player1Id?: string | null
  player2Id?: string | null // null = BYE / Repos
  team1Id?: string | null
  team2Id?: string | null
}

export interface TeamComposition {
  name: string
  seed: number
  memberIds: string[]
}

/**
 * Generates balanced teams based on participants ordered by global tournament rank / points.
 * Rule:
 * For Duos (teamSize = 2):
 *   1st with Last (P[0] + P[N-1])
 *   2nd with 2nd-to-last (P[1] + P[N-2])
 *   3rd with 3rd-to-last (P[2] + P[N-3])
 * For Trios / N-size teams:
 *   Snake draft algorithm (1..M, M..1, 1..M) to balance team total strength.
 */
export function generateBalancedTeams(
  orderedPlayerIds: string[],
  teamSize: number = 2,
  prefix: string = 'Duo'
): TeamComposition[] {
  if (!orderedPlayerIds || orderedPlayerIds.length === 0) return []
  if (teamSize <= 1) {
    return orderedPlayerIds.map((pId, idx) => ({
      name: `Joueur ${idx + 1}`,
      seed: idx + 1,
      memberIds: [pId]
    }))
  }

  const numTeams = Math.ceil(orderedPlayerIds.length / teamSize)
  const teams: TeamComposition[] = Array.from({ length: numTeams }, (_, i) => ({
    name: `${prefix} #${i + 1}`,
    seed: i + 1,
    memberIds: []
  }))

  if (teamSize === 2) {
    // 1st with last, 2nd with 2nd-to-last, etc.
    const N = orderedPlayerIds.length
    for (let i = 0; i < numTeams; i++) {
      const p1 = orderedPlayerIds[i]
      const p2Index = N - 1 - i
      const p2 = p2Index > i ? orderedPlayerIds[p2Index] : null

      if (p1) teams[i].memberIds.push(p1)
      if (p2) teams[i].memberIds.push(p2)
    }
  } else {
    // Snake draft for teamSize >= 3
    let playerIdx = 0
    let round = 0
    while (playerIdx < orderedPlayerIds.length) {
      if (round % 2 === 0) {
        // Forward (0 to numTeams - 1)
        for (let t = 0; t < numTeams && playerIdx < orderedPlayerIds.length; t++) {
          teams[t].memberIds.push(orderedPlayerIds[playerIdx++])
        }
      } else {
        // Backward (numTeams - 1 down to 0)
        for (let t = numTeams - 1; t >= 0 && playerIdx < orderedPlayerIds.length; t--) {
          teams[t].memberIds.push(orderedPlayerIds[playerIdx++])
        }
      }
      round++
    }
  }

  return teams
}

/**
 * Generates an official Round-Robin schedule for any number of entities (players or teams).
 * For 10 entities -> 9 rounds of 5 simultaneous matches = 45 total matches.
 * For 5 entities (e.g. 5 duos) -> 5 rounds of 2 matches + 1 BYE per round = 10 total matches.
 */
export function generateRoundRobinSchedule(entityIds: string[]): Array<{
  roundNumber: number
  matchNumber: number
  entity1Id: string
  entity2Id: string | null
}> {
  if (!entityIds || entityIds.length < 2) return []

  const list = [...entityIds]

  // If odd, add null (BYE) to make it even
  const isOdd = list.length % 2 !== 0
  if (isOdd) {
    list.push(null as any)
  }

  const n = list.length
  const totalRounds = n - 1
  const matchesPerRound = n / 2
  const schedule: Array<{
    roundNumber: number
    matchNumber: number
    entity1Id: string
    entity2Id: string | null
  }> = []

  const currentOrder = [...list]

  for (let r = 0; r < totalRounds; r++) {
    const roundNumber = r + 1
    let matchNumber = 1

    for (let m = 0; m < matchesPerRound; m++) {
      let e1 = currentOrder[m]
      let e2 = currentOrder[n - 1 - m]

      // Alternate home/away to maintain fairness across rounds
      if (r % 2 === 1 && m === 0) {
        const tmp = e1
        e1 = e2
        e2 = tmp
      }

      // If neither is null, or if one is null (bye)
      if (e1 !== null || e2 !== null) {
        // Always place non-null entity in entity1Id if entity2 is BYE
        const finalE1 = e1 !== null ? e1 : e2
        const finalE2 = e1 !== null ? e2 : null

        schedule.push({
          roundNumber,
          matchNumber,
          entity1Id: finalE1,
          entity2Id: finalE2
        })
        matchNumber++
      }
    }

    // Rotate elements: keep currentOrder[0] fixed, rotate currentOrder[1...n-1]
    const fixed = currentOrder[0]
    const last = currentOrder[n - 1]
    const rest = currentOrder.slice(1, n - 1)
    currentOrder.splice(0, currentOrder.length, fixed, last, ...rest)
  }

  return schedule
}

export interface MatchResultData {
  id?: string
  roundNumber: number
  matchNumber: number
  player1Id?: string | null
  player2Id?: string | null
  team1Id?: string | null
  team2Id?: string | null
  player1Score?: number | null
  player2Score?: number | null
  winnerId?: string | null
  winnerTeamId?: string | null
  isDraw?: boolean
  status: string
}

export interface RoundRobinParticipantSummary {
  participantId: string
  played: number
  wins: number
  draws: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  rrPoints: number
  rank: number
  tournamentPoints: number
}

/**
 * Calculates Round-Robin standings for solo players based on completed matches.
 */
export function calculateRoundRobinStandings(
  participantIds: string[],
  matches: MatchResultData[],
  scoringRules: number[] = [10, 8, 6, 5, 4, 3, 2, 1],
  winPoints: number = 3,
  drawPoints: number = 1,
  lossPoints: number = 0
): RoundRobinParticipantSummary[] {
  const statsMap = new Map<string, {
    played: number
    wins: number
    draws: number
    losses: number
    scoreFor: number
    scoreAgainst: number
  }>()

  for (const pId of participantIds) {
    statsMap.set(pId, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0
    })
  }

  for (const match of matches) {
    if (match.status !== 'COMPLETED' || !match.player1Id || !match.player2Id) continue

    const p1 = statsMap.get(match.player1Id)
    const p2 = statsMap.get(match.player2Id)

    if (p1) p1.played++
    if (p2) p2.played++

    const s1 = match.player1Score ?? 0
    const s2 = match.player2Score ?? 0

    if (p1) {
      p1.scoreFor += s1
      p1.scoreAgainst += s2
    }
    if (p2) {
      p2.scoreFor += s2
      p2.scoreAgainst += s1
    }

    if (match.isDraw) {
      if (p1) p1.draws++
      if (p2) p2.draws++
    } else if (match.winnerId === match.player1Id) {
      if (p1) p1.wins++
      if (p2) p2.losses++
    } else if (match.winnerId === match.player2Id) {
      if (p2) p2.wins++
      if (p1) p1.losses++
    }
  }

  const summaries: RoundRobinParticipantSummary[] = participantIds.map((pId) => {
    const s = statsMap.get(pId) || { played: 0, wins: 0, draws: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 }
    const rrPoints = (s.wins * winPoints) + (s.draws * drawPoints) + (s.losses * lossPoints)
    const scoreDiff = s.scoreFor - s.scoreAgainst

    return {
      participantId: pId,
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      scoreFor: s.scoreFor,
      scoreAgainst: s.scoreAgainst,
      scoreDiff,
      rrPoints,
      rank: 1,
      tournamentPoints: 0
    }
  })

  // Sort standings
  summaries.sort((a, b) => {
    if (b.rrPoints !== a.rrPoints) return b.rrPoints - a.rrPoints
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor
    return 0
  })

  let currentRank = 1
  for (let i = 0; i < summaries.length; i++) {
    if (
      i > 0 &&
      (summaries[i].rrPoints < summaries[i - 1].rrPoints ||
        summaries[i].scoreDiff < summaries[i - 1].scoreDiff ||
        summaries[i].wins < summaries[i - 1].wins)
    ) {
      currentRank = i + 1
    }
    summaries[i].rank = currentRank
    summaries[i].tournamentPoints = scoringRules[currentRank - 1] ?? 0
  }

  return summaries
}

export interface RoundRobinTeamSummary {
  teamId: string
  teamName: string
  seed: number
  memberIds: string[]
  played: number
  wins: number
  draws: number
  losses: number
  scoreFor: number
  scoreAgainst: number
  scoreDiff: number
  rrPoints: number
  rank: number
  tournamentPoints: number
}

/**
 * Calculates Round-Robin standings for teams (Duos, Trios, etc.).
 */
export function calculateTeamRoundRobinStandings(
  teams: Array<{ id: string, name: string, seed: number, members: Array<{ id: string }> }>,
  matches: MatchResultData[],
  scoringRules: number[] = [10, 8, 6, 5, 4, 3, 2, 1],
  winPoints: number = 3,
  drawPoints: number = 1,
  lossPoints: number = 0
): RoundRobinTeamSummary[] {
  const statsMap = new Map<string, {
    played: number
    wins: number
    draws: number
    losses: number
    scoreFor: number
    scoreAgainst: number
  }>()

  for (const t of teams) {
    statsMap.set(t.id, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      scoreFor: 0,
      scoreAgainst: 0
    })
  }

  for (const match of matches) {
    if (match.status !== 'COMPLETED' || !match.team1Id || !match.team2Id) continue

    const t1 = statsMap.get(match.team1Id)
    const t2 = statsMap.get(match.team2Id)

    if (t1) t1.played++
    if (t2) t2.played++

    const s1 = match.player1Score ?? 0
    const s2 = match.player2Score ?? 0

    if (t1) {
      t1.scoreFor += s1
      t1.scoreAgainst += s2
    }
    if (t2) {
      t2.scoreFor += s2
      t2.scoreAgainst += s1
    }

    const winningTeam = match.winnerTeamId || (match.winnerId === match.team1Id ? match.team1Id : (match.winnerId === match.team2Id ? match.team2Id : null))

    if (match.isDraw) {
      if (t1) t1.draws++
      if (t2) t2.draws++
    } else if (winningTeam === match.team1Id) {
      if (t1) t1.wins++
      if (t2) t2.losses++
    } else if (winningTeam === match.team2Id) {
      if (t2) t2.wins++
      if (t1) t1.losses++
    }
  }

  const summaries: RoundRobinTeamSummary[] = teams.map((t) => {
    const s = statsMap.get(t.id) || { played: 0, wins: 0, draws: 0, losses: 0, scoreFor: 0, scoreAgainst: 0 }
    const rrPoints = (s.wins * winPoints) + (s.draws * drawPoints) + (s.losses * lossPoints)
    const scoreDiff = s.scoreFor - s.scoreAgainst

    return {
      teamId: t.id,
      teamName: t.name,
      seed: t.seed,
      memberIds: t.members.map((m) => m.id),
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      scoreFor: s.scoreFor,
      scoreAgainst: s.scoreAgainst,
      scoreDiff,
      rrPoints,
      rank: 1,
      tournamentPoints: 0
    }
  })

  // Sort team standings
  summaries.sort((a, b) => {
    if (b.rrPoints !== a.rrPoints) return b.rrPoints - a.rrPoints
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor
    return 0
  })

  let currentRank = 1
  for (let i = 0; i < summaries.length; i++) {
    if (
      i > 0 &&
      (summaries[i].rrPoints < summaries[i - 1].rrPoints ||
        summaries[i].scoreDiff < summaries[i - 1].scoreDiff ||
        summaries[i].wins < summaries[i - 1].wins)
    ) {
      currentRank = i + 1
    }
    summaries[i].rank = currentRank
    summaries[i].tournamentPoints = scoringRules[currentRank - 1] ?? 0
  }

  return summaries
}
