import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const games = await prisma.game.findMany({
    orderBy: {
      name: 'asc'
    }
  })

  return games
})
