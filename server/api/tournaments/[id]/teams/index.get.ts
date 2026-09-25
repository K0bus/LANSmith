import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const gameId = query.gameId as string

  if (!tournamentId) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const tournamentGame = await prisma.tournamentGame.findFirst({
    where: {
      tournamentId,
      ...(gameId ? { gameId } : {})
    },
    include: {
      teams: {
        include: { members: true },
        orderBy: { seed: 'asc' }
      }
    }
  })

  return {
    teams: tournamentGame?.teams || [],
    teamSize: tournamentGame?.teamSize || 1
  }
})
