import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  const tournaments = await prisma.tournament.findMany({
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
      },
      _count: {
        select: {
          scores: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return tournaments.map((t) => {
    // If tournamentGames is empty but games exists, synthesize or migrate
    let tournamentGames = t.tournamentGames
    if ((!tournamentGames || tournamentGames.length === 0) && t.games.length > 0) {
      tournamentGames = t.games.map((g, idx) => ({
        id: `synth-${t.id}-${g.id}`,
        tournamentId: t.id,
        gameId: g.id,
        scoringType: 'SCOREBOARD',
        order: idx + 1,
        game: g,
        rounds: [],
        createdAt: t.createdAt
      }))
    }

    return {
      ...t,
      tournamentGames,
      scoringRules: t.scoringRules ? JSON.parse(t.scoringRules) : [10, 8, 6, 5, 4, 3, 2, 1]
    }
  })
})


