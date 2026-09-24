import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const participants = await prisma.participant.findMany({
    include: {
      rig: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return participants
})
