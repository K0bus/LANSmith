import { prisma } from '~/server/utils/prisma'

interface MatchUpdateInput {
  id: string
  player1Score?: number | null
  player2Score?: number | null
  winnerId?: string | null
  isDraw?: boolean
  status?: string
}

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)
  const matches: MatchUpdateInput[] = body.matches || []

  if (!Array.isArray(matches) || matches.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun match fourni' })
  }

  const updatedMatches = []

  for (const item of matches) {
    if (!item.id) continue

    const existing = await prisma.tournamentMatch.findUnique({
      where: { id: item.id }
    })

    if (!existing) continue

    let computedWinnerId = item.winnerId !== undefined ? item.winnerId : existing.winnerId
    let computedIsDraw = item.isDraw !== undefined ? item.isDraw : existing.isDraw
    let computedStatus = item.status || existing.status

    if (item.player1Score !== undefined && item.player2Score !== undefined && item.player1Score !== null && item.player2Score !== null) {
      const s1 = Number(item.player1Score)
      const s2 = Number(item.player2Score)

      if (s1 > s2) {
        computedWinnerId = existing.player1Id
        computedIsDraw = false
      } else if (s2 > s1) {
        computedWinnerId = existing.player2Id
        computedIsDraw = false
      } else {
        computedWinnerId = null
        computedIsDraw = true
      }

      if (!item.status) {
        computedStatus = 'COMPLETED'
      }
    } else if (item.winnerId !== undefined) {
      if (item.winnerId) {
        computedIsDraw = false
        computedStatus = 'COMPLETED'
      } else if (item.isDraw) {
        computedWinnerId = null
        computedIsDraw = true
        computedStatus = 'COMPLETED'
      } else if (item.winnerId === null && !item.isDraw) {
        computedStatus = 'PENDING'
      }
    }

    const updated = await prisma.tournamentMatch.update({
      where: { id: item.id },
      data: {
        player1Score: item.player1Score !== undefined ? (item.player1Score !== null ? Number(item.player1Score) : null) : undefined,
        player2Score: item.player2Score !== undefined ? (item.player2Score !== null ? Number(item.player2Score) : null) : undefined,
        winnerId: computedWinnerId,
        isDraw: computedIsDraw,
        status: computedStatus
      }
    })

    updatedMatches.push(updated)
  }

  return {
    success: true,
    count: updatedMatches.length,
    matches: updatedMatches
  }
})
