import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)
  const { gameId, onlyPending = true } = body

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  const tournamentGame = await prisma.tournamentGame.findUnique({
    where: {
      tournamentId_gameId: {
        tournamentId,
        gameId
      }
    },
    include: {
      matches: true
    }
  })

  if (!tournamentGame) {
    throw createError({ statusCode: 404, statusMessage: 'Épreuve introuvable' })
  }

  const targetMatches = tournamentGame.matches.filter((m) => {
    const hasOpponent = (m.player1Id && m.player2Id) || (m.team1Id && m.team2Id)
    if (!hasOpponent) return false
    if (onlyPending) return m.status !== 'COMPLETED'
    return true
  })

  const updatedMatches = []

  for (const m of targetMatches) {
    const score1 = Math.floor(Math.random() * 5)
    let score2 = Math.floor(Math.random() * 5)
    if (score1 === score2 && Math.random() > 0.3) {
      score2 = score1 + (Math.random() > 0.5 ? 1 : -1)
      if (score2 < 0) score2 = score1 + 1
    }

    const isDraw = score1 === score2
    const isTeamMatch = !!(m.team1Id || m.team2Id)

    let winnerId = null
    let winnerTeamId = null

    if (!isDraw) {
      if (score1 > score2) {
        if (isTeamMatch) {
          winnerTeamId = m.team1Id
          winnerId = m.team1Id
        } else {
          winnerId = m.player1Id
        }
      } else {
        if (isTeamMatch) {
          winnerTeamId = m.team2Id
          winnerId = m.team2Id
        } else {
          winnerId = m.player2Id
        }
      }
    }

    const updated = await prisma.tournamentMatch.update({
      where: { id: m.id },
      data: {
        player1Score: score1,
        player2Score: score2,
        winnerId,
        winnerTeamId,
        isDraw,
        status: 'COMPLETED'
      }
    })
    updatedMatches.push(updated)
  }

  return {
    success: true,
    message: `${updatedMatches.length} matchs simulés avec succès.`,
    simulatedCount: updatedMatches.length
  }
})
