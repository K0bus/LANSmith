import { prisma } from '~/server/utils/prisma'
import { calculateRoundRobinStandings, calculateTeamRoundRobinStandings } from '~/server/utils/roundRobin'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const query = getQuery(event)
  const gameId = query.gameId as string | undefined

  // Fetch tournament with scoringRules, matches and teams
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentGames: {
        where: gameId ? { gameId } : undefined,
        include: {
          game: true,
          teams: {
            include: {
              members: {
                include: { rig: true }
              }
            },
            orderBy: { seed: 'asc' }
          },
          matches: {
            include: {
              player1: { include: { rig: true } },
              player2: { include: { rig: true } },
              team1: {
                include: {
                  members: { include: { rig: true } }
                }
              },
              team2: {
                include: {
                  members: { include: { rig: true } }
                }
              }
            },
            orderBy: [
              { roundNumber: 'asc' },
              { matchNumber: 'asc' }
            ]
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  })

  if (!tournament) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  const scoringRules: number[] = tournament.scoringRules
    ? JSON.parse(tournament.scoringRules)
    : [10, 8, 6, 5, 4, 3, 2, 1]

  const allParticipants = await prisma.participant.findMany({
    include: { rig: true },
    orderBy: { nickname: 'asc' }
  })

  const participantMap = new Map(allParticipants.map((p) => [p.id, p]))

  // Response per tournament game
  const results = tournament.tournamentGames.map((tg) => {
    const matches = tg.matches || []
    const teams = tg.teams || []
    const isTeamMode = (tg.teamSize && tg.teamSize > 1) || teams.length > 0

    let standings: any[] = []

    if (isTeamMode) {
      // Calculate Team Standings
      standings = calculateTeamRoundRobinStandings(
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
      ).map((st) => {
        const team = teams.find((t) => t.id === st.teamId)
        return {
          ...st,
          teamMembers: team?.members || [],
          points: st.rrPoints
        }
      })
    } else {
      // Calculate Solo Standings
      const pSet = new Set<string>()
      for (const m of matches) {
        if (m.player1Id) pSet.add(m.player1Id)
        if (m.player2Id) pSet.add(m.player2Id)
      }

      const participantIds = pSet.size > 0 ? Array.from(pSet) : allParticipants.map((p) => p.id)

      standings = calculateRoundRobinStandings(
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
      ).map((st) => {
        const p = participantMap.get(st.participantId)
        return {
          ...st,
          participantName: p?.nickname || 'Joueur',
          avatar: p?.avatarUrl || null,
          seatNumber: p?.rig?.gpuName || null,
          points: st.rrPoints
        }
      })
    }

    // Group matches by round
    const roundsMap = new Map<number, typeof matches>()
    for (const m of matches) {
      if (!roundsMap.has(m.roundNumber)) {
        roundsMap.set(m.roundNumber, [])
      }
      roundsMap.get(m.roundNumber)!.push(m)
    }

    const rounds = Array.from(roundsMap.entries()).map(([roundNumber, roundMatches]) => ({
      roundNumber,
      matches: roundMatches,
      completedCount: roundMatches.filter((m) => m.status === 'COMPLETED').length,
      totalCount: roundMatches.length
    }))

    // Statistics
    const totalMatches = matches.length
    const completedMatches = matches.filter((m) => m.status === 'COMPLETED').length
    const inProgressMatches = matches.filter((m) => m.status === 'IN_PROGRESS').length
    const pendingMatches = matches.filter((m) => m.status === 'PENDING').length
    const progressPercent = totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0

    return {
      tournamentGameId: tg.id,
      gameId: tg.gameId,
      gameName: tg.game.name,
      gameCoverUrl: tg.game.coverUrl,
      scoringType: tg.scoringType,
      teamSize: tg.teamSize || 1,
      isTeamMode,
      teams,
      totalMatches,
      completedMatches,
      inProgressMatches,
      pendingMatches,
      progressPercent,
      rounds,
      standings,
      matches
    }
  })

  return {
    tournamentId,
    games: results
  }
})
