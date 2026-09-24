import { prisma } from '~/server/utils/prisma'
import { calculateRoundScores, type CalculateScoreInput } from '~/server/utils/scoring'

interface SaveRoundBody {
  gameId: string
  roundId?: string
  roundNumber?: number
  name?: string
  scores: CalculateScoreInput[]
}

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody<SaveRoundBody>(event)
  const { gameId, roundId, name, scores } = body

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId manquant' })
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Au moins un participant est requis pour enregistrer la manche' })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentGames: {
        where: { gameId },
        include: {
          rounds: true
        }
      }
    }
  })

  if (!tournament) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  // Get or create TournamentGame linkage
  let tournamentGame = tournament.tournamentGames[0]
  if (!tournamentGame) {
    tournamentGame = await prisma.tournamentGame.create({
      data: {
        tournamentId,
        gameId,
        scoringType: 'SCOREBOARD',
        order: 1
      },
      include: {
        rounds: true
      }
    })
  }

  const scoringRules: number[] = tournament.scoringRules 
    ? JSON.parse(tournament.scoringRules) 
    : [10, 8, 6, 5, 4, 3, 2, 1]

  const scoringType = (tournamentGame.scoringType || 'SCOREBOARD') as 'SCOREBOARD' | 'WIN_LOSE'

  // Calculate points using the appropriate algorithm
  const calculatedScores = calculateRoundScores(scoringType, scores, scoringRules)

  let targetRound
  if (roundId) {
    targetRound = await prisma.tournamentRound.findUnique({
      where: { id: roundId }
    })
  }

  if (!targetRound) {
    // Determine next round number
    const maxRoundNum = tournamentGame.rounds.reduce((max, r) => Math.max(max, r.roundNumber), 0)
    const nextRoundNumber = body.roundNumber || maxRoundNum + 1

    targetRound = await prisma.tournamentRound.create({
      data: {
        tournamentGameId: tournamentGame.id,
        roundNumber: nextRoundNumber,
        name: name || `Manche ${nextRoundNumber}`
      }
    })
  } else if (name) {
    targetRound = await prisma.tournamentRound.update({
      where: { id: targetRound.id },
      data: { name }
    })
  }

  // Upsert round scores
  const savedScores = []
  for (const cs of calculatedScores) {
    if (!cs.participantId) continue

    const saved = await prisma.roundScore.upsert({
      where: {
        roundId_participantId: {
          roundId: targetRound.id,
          participantId: cs.participantId
        }
      },
      create: {
        roundId: targetRound.id,
        participantId: cs.participantId,
        isWinner: cs.isWinner,
        rank: cs.rank,
        rawScore: cs.rawScore,
        points: cs.points
      },
      update: {
        isWinner: cs.isWinner,
        rank: cs.rank,
        rawScore: cs.rawScore,
        points: cs.points
      }
    })
    savedScores.push(saved)
  }

  return {
    success: true,
    round: targetRound,
    scoringType,
    scores: savedScores
  }
})
