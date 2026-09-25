import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID manquant' })

  let tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      games: true,
      tournamentGames: {
        include: {
          game: true,
          rounds: {
            include: {
              scores: {
                include: {
                  participant: true
                }
              }
            },
            orderBy: {
              roundNumber: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      },
      scores: {
        include: {
          participant: true,
          game: true
        }
      }
    }
  })

  if (!tournament) {
    throw createError({ statusCode: 404, statusMessage: 'Tournoi introuvable' })
  }

  // Ensure TournamentGame records exist for all associated games
  if (tournament.tournamentGames.length === 0 && tournament.games.length > 0) {
    for (let i = 0; i < tournament.games.length; i++) {
      const g = tournament.games[i]
      await prisma.tournamentGame.upsert({
        where: {
          tournamentId_gameId: {
            tournamentId: id,
            gameId: g.id
          }
        },
        create: {
          tournamentId: id,
          gameId: g.id,
          scoringType: 'SCOREBOARD',
          order: i + 1
        },
        update: {}
      })
    }

    // Re-fetch after population
    tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        games: true,
        tournamentGames: {
          include: {
            game: true,
            rounds: {
              include: {
                scores: {
                  include: {
                    participant: true
                  }
                }
              },
              orderBy: {
                roundNumber: 'asc'
              }
            },
            matches: {
              include: {
                player1: { include: { rig: true } },
                player2: { include: { rig: true } }
              },
              orderBy: [
                { roundNumber: 'asc' },
                { matchNumber: 'asc' }
              ]
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        scores: {
          include: {
            participant: true,
            game: true
          }
        }
      }
    })
  }

  return {
    ...tournament,
    scoringRules: tournament?.scoringRules ? JSON.parse(tournament.scoringRules) : [10, 8, 6, 5, 4, 3, 2, 1]
  }
})


