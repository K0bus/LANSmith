export interface CalculateScoreInput {
  participantId: string
  isWinner?: boolean | null
  rank?: number | null
  rawScore?: number | null
  points?: number
}

export function calculateRoundScores(
  scoringType: 'SCOREBOARD' | 'WIN_LOSE',
  inputs: CalculateScoreInput[],
  scoringRules: number[] = [10, 8, 6, 5, 4, 3, 2, 1]
): Array<{
  participantId: string
  isWinner?: boolean | null
  rank?: number | null
  rawScore?: number | null
  points: number
}> {
  if (scoringType === 'WIN_LOSE') {
    // Count winners and losers among provided inputs
    const winners = inputs.filter((i) => i.isWinner === true)
    const losers = inputs.filter((i) => i.isWinner === false)
    
    const W = winners.length
    const L = losers.length

    // Formula: winners share pool equal to number of losers: points = L / W
    const pointsPerWinner = W > 0 ? Number((L / W).toFixed(2)) : 0

    return inputs.map((item) => {
      const isWinner = item.isWinner === true
      return {
        participantId: item.participantId,
        isWinner: item.isWinner ?? null,
        rank: item.rank ?? null,
        rawScore: item.rawScore ?? null,
        points: isWinner ? pointsPerWinner : 0
      }
    })
  }

  // Default: SCOREBOARD
  return inputs.map((item) => {
    let pts = item.points
    if (pts === undefined || pts === null) {
      if (item.rank && item.rank > 0) {
        const rankIdx = item.rank - 1
        pts = scoringRules[rankIdx] ?? 0
      } else {
        pts = 0
      }
    }

    return {
      participantId: item.participantId,
      isWinner: item.isWinner ?? null,
      rank: item.rank ?? null,
      rawScore: item.rawScore ?? null,
      points: pts
    }
  })
}
