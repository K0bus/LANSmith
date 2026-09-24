import { searchIgdbGames } from '~/server/utils/igdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = (query.q as string) || (query.search as string) || ''

  const config = useRuntimeConfig()
  const clientId = config.twitchClientId || process.env.TWITCH_CLIENT_ID || ''
  const clientSecret = config.twitchClientSecret || process.env.TWITCH_CLIENT_SECRET || ''

  const results = await searchIgdbGames(searchQuery, clientId, clientSecret)

  return {
    query: searchQuery,
    hasTwitchAuth: Boolean(clientId && clientSecret && !clientId.includes('your_twitch')),
    count: results.length,
    results
  }
})
