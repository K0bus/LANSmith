import { defineEventHandler, getQuery } from 'h3'
import { previewExternalPrices } from '../../utils/pricingService'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const steamAppId = query.steamAppId ? String(query.steamAppId).trim() : null
  const name = query.name ? String(query.name).trim() : ''
  const slug = query.slug ? String(query.slug).trim() : null

  if (!steamAppId && !name) {
    return {
      steam: null,
      keyshop: null,
      fetchedAt: new Date().toISOString()
    }
  }

  const result = await previewExternalPrices(steamAppId, name, slug)
  return result
})
