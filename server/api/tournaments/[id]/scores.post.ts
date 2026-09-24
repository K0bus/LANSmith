import { prisma } from '~/server/utils/prisma'
import { calculateRoundScores } from '~/server/utils/scoring'

interface ScoreInput {
  participantId: string
  rank?: number
  rawScore?: number
  points?: number
  isWinner?: boolean
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)
  const { gameId, scores } = body as { gameId: string; scores: ScoreInput[] }

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId manquant' })
  }

  if (!Array.isArray(scores)) {
    throw createError({ statusCode: 400, statusMessage: 'Le tableau des scores est requis' })
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      tournamentGames: {
        where: { gameId },
        include: {
          rounds: {
            include: { scores: true }
          }
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
        tournamentId: id,
        gameId,
        scoringType: 'SCOREBOARD',
        order: 1
      },
      include: {
        rounds: {
          include: { scores: true }
        }
      }
    })
  }

  const scoringRules: number[] = tournament.scoringRules 
    ? JSON.parse(tournament.scoringRules) 
    : [10, 8, 6, 5, 4, 3, 2, 1]

  const scoringType = (tournamentGame.scoringType || 'SCOREBOARD') as 'SCOREBOARD' | 'WIN_LOSE'
  const calculatedScores = calculateRoundScores(scoringType, scores, scoringRules)

  // Find or create Round 1
  let targetRound = tournamentGame.rounds.find((r) => r.roundNumber === 1)
  if (!targetRound) {
    targetRound = await prisma.tournamentRound.create({
      data: {
        tournamentGameId: tournamentGame.id,
        roundNumber: 1,
        name: 'Manche 1'
      },
      include: { scores: true }
    })
  }

  const results = []
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
    results.push(saved)
  }

  return {
    success: true,
    savedCount: results.length,
    results
  }
})

