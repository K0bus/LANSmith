import { prisma } from '~/server/utils/prisma'
import type { LeaderboardEntry, ScoringType } from '~/shared/types'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  const [tournament, participants] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id },
      include: {
        games: true,
        tournamentGames: {
          include: {
            game: true,
            rounds: {
              include: {
                scores: {
                  include: {
                    participant: true
                  }
                }
              },
              orderBy: {
                roundNumber: 'asc'
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        scores: {
          include: {
            participant: true,
            game: true
          }
        }
      }
    }),
    prisma.participant.findMany({
      include: { rig: true },
      orderBy: { nickname: 'asc' }
    })
  ])

  if (!tournament) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  const scoringRules: number[] = tournament.scoringRules 
    ? JSON.parse(tournament.scoringRules) 
    : [10, 8, 6, 5, 4, 3, 2, 1]

  // Map participant scores
  const leaderboardMap = new Map<string, LeaderboardEntry>()

  for (const p of participants) {
    leaderboardMap.set(p.id, {
      participantId: p.id,
      participantName: p.nickname,
      avatar: p.avatarUrl,
      seatNumber: p.rig ? p.rig.gpuName : 'Joueur',
      totalPoints: 0,
      globalRank: 1,
      gameScores: {}
    })
  }

  // Determine game list from tournamentGames (or fallback to games)
  const tournamentGames = tournament.tournamentGames.length > 0 
    ? tournament.tournamentGames 
    : tournament.games.map((g, idx) => ({
        id: `synth-${g.id}`,
        tournamentId: tournament.id,
        gameId: g.id,
        scoringType: 'SCOREBOARD' as const,
        order: idx + 1,
        game: g,
        rounds: [] as any[]
      }))

  let totalRoundsPlayed = 0
  let gamesWithAtLeastOneRound = 0

  for (const tg of tournamentGames) {
    const gameId = tg.gameId
    const scoringType = (tg.scoringType || 'SCOREBOARD') as ScoringType
    const rounds = tg.rounds || []

    // Temporary map of raw round points for this game: participantId -> { rawSum, roundsCount, roundDetails }
    const gameParticipantsMap = new Map<string, {
      rawRoundPoints: number
      roundsCount: number
      roundDetails: Array<{
        roundNumber: number
        isWinner?: boolean | null
        rank?: number | null
        rawScore?: number | null
        points: number
      }>
    }>()

    if (rounds.length > 0) {
      gamesWithAtLeastOneRound++
      totalRoundsPlayed += rounds.length

      for (const round of rounds) {
        for (const rScore of round.scores) {
          if (!gameParticipantsMap.has(rScore.participantId)) {
            gameParticipantsMap.set(rScore.participantId, {
              rawRoundPoints: 0,
              roundsCount: 0,
              roundDetails: []
            })
          }

          const pGameData = gameParticipantsMap.get(rScore.participantId)!
          pGameData.rawRoundPoints = Number((pGameData.rawRoundPoints + rScore.points).toFixed(2))
          pGameData.roundsCount++
          pGameData.roundDetails.push({
            roundNumber: round.roundNumber,
            isWinner: rScore.isWinner,
            rank: rScore.rank,
            rawScore: rScore.rawScore,
            points: rScore.points
          })
        }
      }
    } else {
      // Legacy tournament.scores fallback
      const legacyScores = tournament.scores.filter((s) => s.gameId === gameId)
      if (legacyScores.length > 0) {
        gamesWithAtLeastOneRound++
        for (const s of legacyScores) {
          gameParticipantsMap.set(s.participantId, {
            rawRoundPoints: s.points,
            roundsCount: 1,
            roundDetails: [{
              roundNumber: 1,
              rank: s.rank,
              rawScore: s.rawScore,
              points: s.points
            }]
          })
        }
      }
    }

    // Rank participants for this specific game based on rawRoundPoints
    const activeParticipantsOnGame = Array.from(gameParticipantsMap.entries())
      .map(([pId, data]) => ({
        participantId: pId,
        ...data
      }))
      .sort((a, b) => b.rawRoundPoints - a.rawRoundPoints)

    let currentRank = 1
    for (let i = 0; i < activeParticipantsOnGame.length; i++) {
      if (i > 0 && activeParticipantsOnGame[i].rawRoundPoints < activeParticipantsOnGame[i - 1].rawRoundPoints) {
        currentRank = i + 1
      }
      const p = activeParticipantsOnGame[i]
      const tournamentPoints = scoringRules[currentRank - 1] ?? 0

      const entry = leaderboardMap.get(p.participantId)
      if (entry) {
        entry.gameScores[gameId] = {
          scoringType,
          tournamentPoints,
          gameRank: currentRank,
          rawRoundPoints: p.rawRoundPoints,
          roundsCount: p.roundsCount,
          roundDetails: p.roundDetails
        }
      }
    }
  }

  // Calculate totalPoints across all games for each participant (Sum of tournament points)
  for (const entry of leaderboardMap.values()) {
    let sum = 0
    for (const gScore of Object.values(entry.gameScores)) {
      sum += gScore.tournamentPoints
    }
    entry.totalPoints = Number(sum.toFixed(2))
  }

  // Convert map to array and sort by totalPoints descending
  const leaderboard = Array.from(leaderboardMap.values()).sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints
    }
    return a.participantName.localeCompare(b.participantName)
  })

  // Assign global ranks (with tie support)
  let currentRank = 1
  for (let i = 0; i < leaderboard.length; i++) {
    if (i > 0 && leaderboard[i].totalPoints < leaderboard[i - 1].totalPoints) {
      currentRank = i + 1
    }
    leaderboard[i].globalRank = currentRank
  }

  // Extract recent score submissions
  const allRecentScores: any[] = []

  for (const tg of tournamentGames) {
    const rounds = tg.rounds || []
    for (const round of rounds) {
      for (const rScore of round.scores) {
        allRecentScores.push({
          id: rScore.id,
          createdAt: rScore.createdAt,
          participantId: rScore.participantId,
          participantName: rScore.participant?.nickname || 'Joueur',
          avatar: rScore.participant?.avatarUrl,
          gameId: tg.game.id,
          gameName: tg.game.name,
          gameCoverUrl: tg.game.coverUrl,
          scoringType: tg.scoringType || 'SCOREBOARD',
          roundNumber: round.roundNumber,
          roundName: round.name || `Manche ${round.roundNumber}`,
          points: rScore.points,
          rank: rScore.rank,
          rawScore: rScore.rawScore,
          isWinner: rScore.isWinner
        })
      }
    }
  }

  // Also include legacy scores if any
  for (const s of tournament.scores) {
    allRecentScores.push({
      id: s.id,
      createdAt: s.createdAt,
      participantId: s.participantId,
      participantName: s.participant?.nickname || 'Joueur',
      avatar: s.participant?.avatarUrl,
      gameId: s.game.id,
      gameName: s.game.name,
      gameCoverUrl: s.game.coverUrl,
      scoringType: 'SCOREBOARD',
      roundNumber: 1,
      roundName: 'Manche 1',
      points: s.points,
      rank: s.rank,
      rawScore: s.rawScore,
      isWinner: s.rank === 1
    })
  }

  // Sort by createdAt descending and keep top 30
  allRecentScores.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const recentScores = allRecentScores.slice(0, 30)

  // Calculate tournament progress
  const totalGamesCount = tournamentGames.length
  const progressPercent = totalGamesCount > 0 ? Math.round((gamesWithAtLeastOneRound / totalGamesCount) * 100) : 0

  return {
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      scoringRules,
      totalGames: totalGamesCount,
      completedGames: gamesWithAtLeastOneRound,
      totalRoundsPlayed,
      progressPercent,
      games: tournamentGames.map((tg) => {
        const gameStandings = leaderboard
          .filter(p => p.gameScores[tg.game.id] && p.gameScores[tg.game.id].roundsCount > 0)
          .map(p => ({
            participantId: p.participantId,
            participantName: p.participantName,
            avatar: p.avatar,
            seatNumber: p.seatNumber,
            gameRank: p.gameScores[tg.game.id].gameRank,
            tournamentPoints: p.gameScores[tg.game.id].tournamentPoints,
            rawRoundPoints: p.gameScores[tg.game.id].rawRoundPoints,
            roundsCount: p.gameScores[tg.game.id].roundsCount,
            roundDetails: p.gameScores[tg.game.id].roundDetails
          }))
          .sort((a, b) => (a.gameRank ?? 999) - (b.gameRank ?? 999))

        return {
          id: tg.game.id,
          tournamentGameId: tg.id,
          order: tg.order,
          name: tg.game.name,
          coverUrl: tg.game.coverUrl,
          genres: tg.game.genres || '',
          scoringType: tg.scoringType || 'SCOREBOARD',
          roundsCount: tg.rounds ? tg.rounds.length : 0,
          gameLeaderboard: gameStandings
        }
      })
    },
    leaderboard,
    podium: leaderboard.slice(0, 3),
    recentScores
  }
})



