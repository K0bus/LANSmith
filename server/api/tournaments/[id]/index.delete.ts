import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const existing = await prisma.tournament.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  await prisma.tournament.delete({
    where: { id }
  })

  return {
    success: true,
    deletedId: id
  }
})
