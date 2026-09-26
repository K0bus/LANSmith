import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { updateGamePrices } from '../../../utils/pricingService'
import { getEffectivePrice } from '~/shared/utils/pricing'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID du jeu manquant' })
  }

  const body = (await readBody(event).catch(() => ({}))) || {}
  const force = body.force !== undefined ? Boolean(body.force) : true

  try {
    const result = await updateGamePrices(id, { force })
    const effectivePrice = getEffectivePrice(result.game)

    return {
      success: true,
      cached: result.cached,
      message: result.message,
      game: result.game,
      effectivePrice
    }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erreur lors de l’actualisation des prix.'
    })
  }
})
