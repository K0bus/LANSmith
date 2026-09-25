import { prisma } from '~/server/utils/prisma'

interface GameConfigInput {
  gameId: string
  scoringType?: 'SCOREBOARD' | 'WIN_LOSE' | 'ROUND_ROBIN'
  teamSize?: number
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID tournoi manquant' })

  const body = await readBody(event)

  if (!body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le nom du tournoi est obligatoire.'
    })
  }

  const existing = await prisma.tournament.findUnique({
    where: { id },
    include: {
      tournamentGames: true
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  // Parse game configs
  let gameConfigs: GameConfigInput[] = []
  if (Array.isArray(body.games)) {
    gameConfigs = body.games.map((g: any) => typeof g === 'string' ? { gameId: g } : g)
  } else if (Array.isArray(body.gameIds)) {
    gameConfigs = body.gameIds.map((gameId: string) => ({ gameId }))
  }

  const scoringRules = body.scoringRules || [10, 8, 6, 5, 4, 3, 2, 1]
  const status = body.status || existing.status

  // Update tournament details and disconnect old games / connect new ones
  await prisma.tournament.update({
    where: { id },
    data: {
      name: body.name.trim(),
      status,
      scoringRules: JSON.stringify(scoringRules),
      games: {
        set: gameConfigs.map((g) => ({ id: g.gameId }))
      }
    }
  })

  // Synchronize TournamentGame records
  const targetGameIds = new Set(gameConfigs.map((g) => g.gameId))

  // Delete TournamentGame records that are no longer selected
  await prisma.tournamentGame.deleteMany({
    where: {
      tournamentId: id,
      gameId: {
        notIn: Array.from(targetGameIds)
      }
    }
  })

  // Upsert each TournamentGame
  for (let idx = 0; idx < gameConfigs.length; idx++) {
    const gc = gameConfigs[idx]
    await prisma.tournamentGame.upsert({
      where: {
        tournamentId_gameId: {
          tournamentId: id,
          gameId: gc.gameId
        }
      },
      create: {
        tournamentId: id,
        gameId: gc.gameId,
        scoringType: gc.scoringType || 'SCOREBOARD',
        teamSize: gc.teamSize || 1,
        order: idx + 1
      },
      update: {
        scoringType: gc.scoringType || 'SCOREBOARD',
        teamSize: gc.teamSize || 1,
        order: idx + 1
      }
    })
  }

  // Return updated tournament
  const updated = await prisma.tournament.findUnique({
    where: { id },
    include: {
      games: true,
      tournamentGames: {
        include: {
          game: true,
          rounds: true
        },
        orderBy: {
          order: 'asc'
        }
      }
    }
  })

  return {
    ...updated,
    scoringRules: updated?.scoringRules ? JSON.parse(updated.scoringRules) : scoringRules
  }
})
