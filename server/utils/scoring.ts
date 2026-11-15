export interface CalculateScoreInput {
  participantId: string
  isWinner?: boolean | null
  hasBonus?: boolean | null
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
  hasBonus?: boolean | null
  rank?: number | null
  rawScore?: number | null
  points: number
}> {
  if (scoringType === 'WIN_LOSE') {
    // Count winners and total participants
    const winners = inputs.filter((i) => i.isWinner === true)
    const W = winners.length
    const totalPlayers = inputs.length

    // Formula: points pool = total players / number of winners
    const pointsPerWinner = W > 0 ? Number((totalPlayers / W).toFixed(2)) : 0
    // Bonus points = half of winners points (rounded to 2 decimal places), without impacting winner points
    const bonusPoints = W > 0 ? Number((pointsPerWinner / 2).toFixed(2)) : 0

    return inputs.map((item) => {
      const isWinner = item.isWinner === true
      const hasBonus = item.hasBonus === true
      let pts = 0
      if (isWinner) pts += pointsPerWinner
      if (hasBonus) pts += bonusPoints

      return {
        participantId: item.participantId,
        isWinner: item.isWinner ?? null,
        hasBonus: item.hasBonus ?? null,
        rank: item.rank ?? null,
        rawScore: item.rawScore ?? null,
        points: Number(pts.toFixed(2))
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
      hasBonus: item.hasBonus ?? null,
      rank: item.rank ?? null,
      rawScore: item.rawScore ?? null,
      points: pts
    }
  })
}
