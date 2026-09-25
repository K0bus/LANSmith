import { prisma } from '~/server/utils/prisma'
import { calculateRoundRobinStandings, calculateTeamRoundRobinStandings } from '~/server/utils/roundRobin'
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
            teams: {
              include: {
                members: true
              },
              orderBy: { seed: 'asc' }
            },
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
            },
            matches: {
              include: {
                player1: true,
                player2: true,
                team1: {
                  include: { members: true }
                },
                team2: {
                  include: { members: true }
                }
              },
              orderBy: [
                { roundNumber: 'asc' },
                { matchNumber: 'asc' }
              ]
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
        teamSize: 1,
        order: idx + 1,
        game: g,
        rounds: [] as any[],
        matches: [] as any[],
        teams: [] as any[]
      }))

  let totalRoundsPlayed = 0
  let gamesWithAtLeastOneRound = 0

  for (const tg of tournamentGames) {
    const gameId = tg.gameId
    const scoringType = (tg.scoringType || 'SCOREBOARD') as ScoringType
    const rounds = tg.rounds || []
    const matches = tg.matches || []
    const teams = tg.teams || []
    const isTeamMode = (tg.teamSize && tg.teamSize > 1) || teams.length > 0

    if (scoringType === 'ROUND_ROBIN') {
      const completedMatches = matches.filter((m) => m.status === 'COMPLETED' && (m.player2Id || m.team2Id))
      if (completedMatches.length > 0) {
        gamesWithAtLeastOneRound++
      }
      totalRoundsPlayed += new Set(matches.filter((m) => m.status === 'COMPLETED').map((m) => m.roundNumber)).size

      if (isTeamMode && teams.length > 0) {
        // Calculate Team Standings
        const teamStandings = calculateTeamRoundRobinStandings(
          teams.map((t) => ({
            id: t.id,
            name: t.name,
            seed: t.seed,
            members: t.members
          })),
          matches.map((m) => ({
            id: m.id,
            roundNumber: m.roundNumber,
            matchNumber: m.matchNumber,
            team1Id: m.team1Id,
            team2Id: m.team2Id,
            player1Score: m.player1Score,
            player2Score: m.player2Score,
            winnerTeamId: m.winnerTeamId,
            winnerId: m.winnerId,
            isDraw: m.isDraw,
            status: m.status
          })),
          scoringRules
        )

        // Award points to all team members
        for (const tStand of teamStandings) {
          for (const memberId of tStand.memberIds) {
            const entry = leaderboardMap.get(memberId)
            if (entry) {
              entry.gameScores[gameId] = {
                scoringType: 'ROUND_ROBIN',
                tournamentPoints: tStand.tournamentPoints,
                gameRank: tStand.rank,
                rawRoundPoints: tStand.rrPoints,
                roundsCount: tStand.played,
                roundDetails: [],
                roundRobinStats: {
                  played: tStand.played,
                  wins: tStand.wins,
                  draws: tStand.draws,
                  losses: tStand.losses,
                  scoreDiff: tStand.scoreDiff,
                  rrPoints: tStand.rrPoints
                }
              }
            }
          }
        }
      } else {
        // Solo mode
        const pSet = new Set<string>()
        for (const m of matches) {
          if (m.player1Id) pSet.add(m.player1Id)
          if (m.player2Id) pSet.add(m.player2Id)
        }
        const participantIds = pSet.size > 0 ? Array.from(pSet) : participants.map((p) => p.id)

        const rrStandings = calculateRoundRobinStandings(
          participantIds,
          matches.map((m) => ({
            id: m.id,
            roundNumber: m.roundNumber,
            matchNumber: m.matchNumber,
            player1Id: m.player1Id,
            player2Id: m.player2Id,
            player1Score: m.player1Score,
            player2Score: m.player2Score,
            winnerId: m.winnerId,
            isDraw: m.isDraw,
            status: m.status
          })),
          scoringRules
        )

        for (const st of rrStandings) {
          const entry = leaderboardMap.get(st.participantId)
          if (entry) {
            entry.gameScores[gameId] = {
              scoringType: 'ROUND_ROBIN',
              tournamentPoints: st.tournamentPoints,
              gameRank: st.rank,
              rawRoundPoints: st.rrPoints,
              roundsCount: st.played,
              roundDetails: [],
              roundRobinStats: {
                played: st.played,
                wins: st.wins,
                draws: st.draws,
                losses: st.losses,
                scoreDiff: st.scoreDiff,
                rrPoints: st.rrPoints
              }
            }
          }
        }
      }
    } else {
      // Scoreboard / Win-Loss modes
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
        // Legacy scores fallback
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

  // Extract recent score submissions & completed match events
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

    // Include completed matches in recent scores
    const matches = tg.matches || []
    for (const m of matches) {
      if (m.status === 'COMPLETED') {
        if (m.team1 && m.team2) {
          const winnerTeam = m.winnerTeamId === m.team1Id ? m.team1 : (m.winnerTeamId === m.team2Id ? m.team2 : null)
          allRecentScores.push({
            id: m.id,
            createdAt: m.updatedAt || m.createdAt,
            participantId: m.winnerTeamId || m.team1Id,
            participantName: winnerTeam ? winnerTeam.name : (m.isDraw ? `${m.team1.name} vs ${m.team2.name}` : m.team1.name),
            avatar: null,
            gameId: tg.game.id,
            gameName: tg.game.name,
            gameCoverUrl: tg.game.coverUrl,
            scoringType: 'ROUND_ROBIN',
            roundNumber: m.roundNumber,
            roundName: `Tour ${m.roundNumber} - Match ${m.matchNumber}`,
            points: m.isDraw ? 1 : 3,
            rank: null,
            rawScore: m.player1Score !== null && m.player2Score !== null ? `${m.player1Score} - ${m.player2Score}` : null,
            isWinner: !m.isDraw
          })
        } else if (m.player1 && m.player2) {
          const winner = m.winnerId === m.player1Id ? m.player1 : (m.winnerId === m.player2Id ? m.player2 : null)
          allRecentScores.push({
            id: m.id,
            createdAt: m.updatedAt || m.createdAt,
            participantId: m.winnerId || m.player1Id,
            participantName: winner ? winner.nickname : (m.isDraw ? `${m.player1.nickname} vs ${m.player2.nickname}` : m.player1.nickname),
            avatar: winner ? winner.avatarUrl : null,
            gameId: tg.game.id,
            gameName: tg.game.name,
            gameCoverUrl: tg.game.coverUrl,
            scoringType: 'ROUND_ROBIN',
            roundNumber: m.roundNumber,
            roundName: `Tour ${m.roundNumber} - Match ${m.matchNumber}`,
            points: m.isDraw ? 1 : 3,
            rank: null,
            rawScore: m.player1Score !== null && m.player2Score !== null ? `${m.player1Score} - ${m.player2Score}` : null,
            isWinner: !m.isDraw
          })
        }
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
          .filter(p => p.gameScores[tg.game.id] && (p.gameScores[tg.game.id].roundsCount > 0 || tg.scoringType === 'ROUND_ROBIN'))
          .map(p => ({
            participantId: p.participantId,
            participantName: p.participantName,
            avatar: p.avatar,
            seatNumber: p.seatNumber,
            gameRank: p.gameScores[tg.game.id]?.gameRank,
            tournamentPoints: p.gameScores[tg.game.id]?.tournamentPoints,
            rawRoundPoints: p.gameScores[tg.game.id]?.rawRoundPoints,
            roundsCount: p.gameScores[tg.game.id]?.roundsCount,
            roundDetails: p.gameScores[tg.game.id]?.roundDetails,
            roundRobinStats: p.gameScores[tg.game.id]?.roundRobinStats
          }))
          .sort((a, b) => (a.gameRank ?? 999) - (b.gameRank ?? 999))

        const matches = tg.matches || []
        const totalMatches = matches.length
        const completedMatches = matches.filter((m) => m.status === 'COMPLETED').length

        return {
          id: tg.game.id,
          tournamentGameId: tg.id,
          order: tg.order,
          name: tg.game.name,
          coverUrl: tg.game.coverUrl,
          genres: tg.game.genres || '',
          scoringType: tg.scoringType || 'SCOREBOARD',
          teamSize: tg.teamSize || 1,
          teams: tg.teams || [],
          roundsCount: tg.scoringType === 'ROUND_ROBIN' 
            ? new Set(matches.map((m) => m.roundNumber)).size 
            : (tg.rounds ? tg.rounds.length : 0),
          totalMatches,
          completedMatches,
          gameLeaderboard: gameStandings
        }
      })
    },
    leaderboard,
    podium: leaderboard.slice(0, 3),
    recentScores
  }
})
