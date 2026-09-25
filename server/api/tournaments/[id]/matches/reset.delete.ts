import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const query = getQuery(event)
  const gameId = query.gameId as string | undefined

  if (!gameId) {
    throw createError({ statusCode: 400, statusMessage: 'gameId requis' })
  }

  const tournamentGame = await prisma.tournamentGame.findUnique({
    where: {
      tournamentId_gameId: {
        tournamentId,
        gameId
      }
    }
  })

  if (!tournamentGame) {
    throw createError({ statusCode: 404, statusMessage: 'Épreuve introuvable' })
  }

  // Delete matches
  const { count } = await prisma.tournamentMatch.deleteMany({
    where: {
      tournamentGameId: tournamentGame.id
    }
  })

  return {
    success: true,
    deletedCount: count,
    message: 'Tous les matchs ont été réinitialisés.'
  }
})
