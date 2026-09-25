import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  const matchId = getRouterParam(event, 'matchId')
  if (!tournamentId || !matchId) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })
  }

  const body = await readBody(event)
  const { player1Score, player2Score, winnerId, winnerTeamId, isDraw, status } = body

  // Find match
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      tournamentGame: true
    }
  })

  if (!match || match.tournamentGame.tournamentId !== tournamentId) {
    throw createError({ statusCode: 404, statusMessage: 'Match introuvable' })
  }

  const isTeamMatch = !!(match.team1Id || match.team2Id)

  // Determine winner or draw automatically if scores provided and winnerId not explicitly provided
  let computedWinnerId = winnerId !== undefined ? winnerId : match.winnerId
  let computedWinnerTeamId = winnerTeamId !== undefined ? winnerTeamId : match.winnerTeamId
  let computedIsDraw = isDraw !== undefined ? isDraw : match.isDraw
  let computedStatus = status || match.status

  if (player1Score !== undefined && player2Score !== undefined && player1Score !== null && player2Score !== null) {
    const s1 = Number(player1Score)
    const s2 = Number(player2Score)

    if (s1 > s2) {
      if (isTeamMatch) {
        computedWinnerTeamId = match.team1Id
        computedWinnerId = match.team1Id
      } else {
        computedWinnerId = match.player1Id
      }
      computedIsDraw = false
    } else if (s2 > s1) {
      if (isTeamMatch) {
        computedWinnerTeamId = match.team2Id
        computedWinnerId = match.team2Id
      } else {
        computedWinnerId = match.player2Id
      }
      computedIsDraw = false
    } else {
      computedWinnerId = null
      computedWinnerTeamId = null
      computedIsDraw = true
    }

    if (!status) {
      computedStatus = 'COMPLETED'
    }
  } else if (winnerId !== undefined || winnerTeamId !== undefined) {
    const targetWinner = winnerTeamId || winnerId
    if (targetWinner) {
      computedWinnerId = targetWinner
      computedWinnerTeamId = isTeamMatch ? targetWinner : null
      computedIsDraw = false
      computedStatus = 'COMPLETED'
    } else if (isDraw) {
      computedWinnerId = null
      computedWinnerTeamId = null
      computedIsDraw = true
      computedStatus = 'COMPLETED'
    } else if (targetWinner === null && !isDraw) {
      // Reset
      computedWinnerId = null
      computedWinnerTeamId = null
      computedStatus = 'PENDING'
    }
  }

  const updated = await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      player1Score: player1Score !== undefined ? (player1Score !== null ? Number(player1Score) : null) : undefined,
      player2Score: player2Score !== undefined ? (player2Score !== null ? Number(player2Score) : null) : undefined,
      winnerId: computedWinnerId,
      winnerTeamId: computedWinnerTeamId,
      isDraw: computedIsDraw,
      status: computedStatus
    },
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
    }
  })

  return {
    success: true,
    match: updated
  }
})
