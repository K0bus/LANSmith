import { prisma } from '~/server/utils/prisma'
import { generateBalancedTeams } from '~/server/utils/roundRobin'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)
  const { gameId, teamSize = 2, autoBalance = true, shuffle = false, saveToDb = true } = body

  if (!gameId) throw createError({ statusCode: 400, statusMessage: 'gameId requis' })

  // Find or create TournamentGame
  let tournamentGame = await prisma.tournamentGame.findUnique({
    where: {
      tournamentId_gameId: {
        tournamentId,
        gameId
      }
    },
    include: {
      teams: {
        include: { members: true },
        orderBy: { seed: 'asc' }
      }
    }
  })

  if (!tournamentGame) {
    tournamentGame = await prisma.tournamentGame.create({
      data: {
        tournamentId,
        gameId,
        scoringType: 'SCOREBOARD',
        teamSize,
        order: 1
      },
      include: {
        teams: {
          include: { members: true },
          orderBy: { seed: 'asc' }
        }
      }
    })
  }

  // Fetch all participants
  const allParticipants = await prisma.participant.findMany({
    orderBy: { nickname: 'asc' }
  })
  let participantIds = allParticipants.map((p) => p.id)

  if (autoBalance && !shuffle) {
    // Order participants by current tournament leaderboard points
    const tournamentScores = await prisma.roundScore.findMany({
      where: {
        round: {
          tournamentGame: {
            tournamentId
          }
        }
      }
    })

    const scoreMap = new Map<string, number>()
    for (const p of allParticipants) {
      scoreMap.set(p.id, 0)
    }
    for (const s of tournamentScores) {
      scoreMap.set(s.participantId, (scoreMap.get(s.participantId) || 0) + s.points)
    }

    participantIds.sort((a, b) => {
      const diff = (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0)
      if (diff !== 0) return diff
      return a.localeCompare(b)
    })
  } else if (shuffle) {
    participantIds.sort(() => Math.random() - 0.5)
  }

  // Generate balanced teams using 1st+last / snake draft
  const generatedTeams = generateBalancedTeams(participantIds, teamSize)

  if (saveToDb) {
    // Update tournamentGame teamSize
    await prisma.tournamentGame.update({
      where: { id: tournamentGame.id },
      data: { teamSize }
    })

    // Delete existing teams if no matches are referencing them
    await prisma.tournamentTeam.deleteMany({
      where: { tournamentGameId: tournamentGame.id }
    })

    // Insert new teams
    const createdTeams = []
    for (const t of generatedTeams) {
      const created = await prisma.tournamentTeam.create({
        data: {
          tournamentGameId: tournamentGame.id,
          name: t.name,
          seed: t.seed,
          members: {
            connect: t.memberIds.map((mId) => ({ id: mId }))
          }
        },
        include: { members: true }
      })
      createdTeams.push(created)
    }

    return {
      success: true,
      teams: createdTeams
    }
  }

  const participantMap = new Map(allParticipants.map((p) => [p.id, p]))
  return {
    success: true,
    teams: generatedTeams.map((t) => ({
      id: t.id,
      name: t.name,
      seed: t.seed,
      memberIds: t.memberIds,
      members: t.memberIds.map((id) => participantMap.get(id)).filter(Boolean)
    }))
  }
})
