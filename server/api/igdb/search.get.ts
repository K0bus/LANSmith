import { searchIgdbGames } from '~/server/utils/igdb'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const searchQuery = (query.q as string) || ''

  const config = useRuntimeConfig()
  const clientId = String(config.twitchClientId || process.env.TWITCH_CLIENT_ID || process.env.NUXT_TWITCH_CLIENT_ID || '').trim()
  const clientSecret = String(config.twitchClientSecret || process.env.TWITCH_CLIENT_SECRET || process.env.NUXT_TWITCH_CLIENT_SECRET || '').trim()

  const results = await searchIgdbGames(searchQuery, clientId, clientSecret)

  return {
    query: searchQuery,
    hasTwitchAuth: Boolean(clientId && clientSecret && !clientId.includes('your_twitch')),
    count: results.length,
    results
  }
})
