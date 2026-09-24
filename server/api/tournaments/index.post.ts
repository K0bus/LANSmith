import { prisma } from '~/server/utils/prisma'

interface GameConfigInput {
  gameId: string
  scoringType?: 'SCOREBOARD' | 'WIN_LOSE'
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le nom du tournoi est obligatoire.'
    })
  }

  // Handle either games array of objects or gameIds array of strings
  let gameConfigs: GameConfigInput[] = []
  if (Array.isArray(body.games)) {
    gameConfigs = body.games.map((g: any) => typeof g === 'string' ? { gameId: g } : g)
  } else if (Array.isArray(body.gameIds)) {
    gameConfigs = body.gameIds.map((id: string) => ({ gameId: id }))
  }

  const scoringRules = body.scoringRules || [10, 8, 6, 5, 4, 3, 2, 1]

  const tournament = await prisma.tournament.create({
    data: {
      name: body.name.trim(),
      status: body.status || 'DRAFT',
      scoringRules: JSON.stringify(scoringRules),
      games: {
        connect: gameConfigs.map((g) => ({ id: g.gameId }))
      },
      tournamentGames: {
        create: gameConfigs.map((g, idx) => ({
          gameId: g.gameId,
          scoringType: g.scoringType || 'SCOREBOARD',
          order: idx + 1
        }))
      }
    },
    include: {
      games: true,
      tournamentGames: {
        include: {
          game: true,
          rounds: {
            include: {
              scores: true
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })

  return {
    ...tournament,
    scoringRules: tournament.scoringRules ? JSON.parse(tournament.scoringRules) : scoringRules
  }
})


