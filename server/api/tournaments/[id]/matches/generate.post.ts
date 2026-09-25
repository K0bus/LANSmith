import { prisma } from '~/server/utils/prisma'
import { generateRoundRobinSchedule, generateBalancedTeams } from '~/server/utils/roundRobin'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)
  const { 
    gameId, 
    teamSize = 1, 
    participantIds, 
    customTeams, 
    autoBalanceTeams = true, 
    shuffle = false 
  } = body

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  // Find TournamentGame
  const tournamentGame = await prisma.tournamentGame.findUnique({
    where: {
      tournamentId_gameId: {
        tournamentId,
        gameId
      }
    },
    include: {
      game: true
    }
  })

  if (!tournamentGame) {
    throw createError({ statusCode: 404, statusMessage: 'Épreuve introuvable pour ce tournoi' })
  }

  // Determine participants list
  let selectedParticipantIds: string[] = participantIds

  if (!selectedParticipantIds || selectedParticipantIds.length === 0) {
    const allParticipants = await prisma.participant.findMany({
      orderBy: { nickname: 'asc' }
    })
    selectedParticipantIds = allParticipants.map((p) => p.id)
  }

  if (selectedParticipantIds.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Au moins 2 participants sont nécessaires pour générer un tournoi Round-Robin.'
    })
  }

  // If auto-balancing teams based on global tournament leaderboard
  if (teamSize > 1 && autoBalanceTeams && !customTeams && !shuffle) {
    // Fetch current tournament leaderboard data to order participants by total score / rank
    const tournamentScores = await prisma.roundScore.findMany({
      where: {
        round: {
          tournamentGame: {
            tournamentId
          }
        },
        participantId: { in: selectedParticipantIds }
      }
    })

    const scoreMap = new Map<string, number>()
    for (const pId of selectedParticipantIds) {
      scoreMap.set(pId, 0)
    }
    for (const s of tournamentScores) {
      scoreMap.set(s.participantId, (scoreMap.get(s.participantId) || 0) + s.points)
    }

    // Sort: highest score (1st) to lowest score (last)
    selectedParticipantIds = [...selectedParticipantIds].sort((a, b) => {
      const scoreA = scoreMap.get(a) || 0
      const scoreB = scoreMap.get(b) || 0
      return scoreB - scoreA
    })
  } else if (shuffle) {
    selectedParticipantIds = [...selectedParticipantIds].sort(() => Math.random() - 0.5)
  }

  // Clear existing matches and teams for this game
  await prisma.tournamentMatch.deleteMany({
    where: {
      tournamentGameId: tournamentGame.id
    }
  })

  await prisma.tournamentTeam.deleteMany({
    where: {
      tournamentGameId: tournamentGame.id
    }
  })

  // Update teamSize on TournamentGame
  await prisma.tournamentGame.update({
    where: { id: tournamentGame.id },
    data: { teamSize: Number(teamSize) }
  })

  const createdMatches = []

  if (teamSize > 1) {
    // TEAM MODE (Duos, Trios, etc.)
    let teamsData = customTeams

    if (!teamsData || teamsData.length === 0) {
      const prefix = teamSize === 2 ? 'Duo' : 'Équipe'
      teamsData = generateBalancedTeams(selectedParticipantIds, Number(teamSize), prefix)
    }

    // Create TournamentTeam records
    const createdTeams = []
    for (let i = 0; i < teamsData.length; i++) {
      const t = teamsData[i]
      const createdTeam = await prisma.tournamentTeam.create({
        data: {
          tournamentGameId: tournamentGame.id,
          name: t.name || (teamSize === 2 ? `Duo #${i + 1}` : `Équipe #${i + 1}`),
          seed: t.seed || (i + 1),
          members: {
            connect: (t.memberIds || []).map((id: string) => ({ id }))
          }
        },
        include: {
          members: true
        }
      })
      createdTeams.push(createdTeam)
    }

    // Generate schedule for teams
    const teamIds = createdTeams.map((t) => t.id)
    const pairings = generateRoundRobinSchedule(teamIds)

    for (const item of pairings) {
      const isBye = item.entity2Id === null
      const created = await prisma.tournamentMatch.create({
        data: {
          tournamentGameId: tournamentGame.id,
          roundNumber: item.roundNumber,
          matchNumber: item.matchNumber,
          team1Id: item.entity1Id,
          team2Id: item.entity2Id,
          status: isBye ? 'COMPLETED' : 'PENDING',
          winnerTeamId: isBye ? item.entity1Id : null
        }
      })
      createdMatches.push(created)
    }

    const totalRounds = pairings.length > 0 ? Math.max(...pairings.map((p) => p.roundNumber)) : 0
    const matchesPerRound = pairings.filter((p) => p.roundNumber === 1).length

    return {
      success: true,
      message: `Tableau Round-Robin par ${teamSize === 2 ? 'Duo' : 'Équipe'} généré : ${createdTeams.length} équipes (${selectedParticipantIds.length} joueurs), ${totalRounds} tours, ${createdMatches.length} matchs.`,
      summary: {
        teamSize,
        teamsCount: createdTeams.length,
        playersCount: selectedParticipantIds.length,
        totalRounds,
        matchesPerRound,
        totalMatches: createdMatches.length
      },
      tournamentGameId: tournamentGame.id
    }
  } else {
    // SOLO MODE (1v1)
    const pairings = generateRoundRobinSchedule(selectedParticipantIds)

    for (const item of pairings) {
      const isBye = item.entity2Id === null
      const created = await prisma.tournamentMatch.create({
        data: {
          tournamentGameId: tournamentGame.id,
          roundNumber: item.roundNumber,
          matchNumber: item.matchNumber,
          player1Id: item.entity1Id,
          player2Id: item.entity2Id,
          status: isBye ? 'COMPLETED' : 'PENDING',
          winnerId: isBye ? item.entity1Id : null
        }
      })
      createdMatches.push(created)
    }

    const totalRounds = pairings.length > 0 ? Math.max(...pairings.map((p) => p.roundNumber)) : 0
    const matchesPerRound = pairings.filter((p) => p.roundNumber === 1).length

    return {
      success: true,
      message: `Tableau officiel Round-Robin Solo généré : ${selectedParticipantIds.length} joueurs, ${totalRounds} tours, ${createdMatches.length} matchs.`,
      summary: {
        teamSize: 1,
        playersCount: selectedParticipantIds.length,
        totalRounds,
        matchesPerRound,
        totalMatches: createdMatches.length
      },
      tournamentGameId: tournamentGame.id
    }
  }
})
