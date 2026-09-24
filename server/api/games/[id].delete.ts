import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' })
  }

  await prisma.game.delete({
    where: { id }
  })

  return { success: true }
})
