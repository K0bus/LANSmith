import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const tournamentId = getRouterParam(event, 'id')
  const roundId = getRouterParam(event, 'roundId')

  if (!tournamentId || !roundId) {
    throw createError({ statusCode: 400, statusMessage: 'Paramètres manquants' })
  }

  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: {
      tournamentGame: true
    }
  })

  if (!round || round.tournamentGame.tournamentId !== tournamentId) {
    throw createError({ statusCode: 404, statusMessage: 'Manche introuvable' })
  }

  await prisma.tournamentRound.delete({
    where: { id: roundId }
  })

  return {
    success: true,
    deletedRoundId: roundId
  }
})
