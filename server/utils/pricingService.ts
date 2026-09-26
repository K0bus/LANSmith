import { prisma } from './prisma'

export interface SteamPriceResult {
  success: boolean
  isFree: boolean
  priceCents: number | null
  initialCents: number | null
  discountPercent: number
  currency: string
  formatted?: string
}

export interface KeyshopPriceResult {
  success: boolean
  priceCents: number | null
  shopName: string
  currency: string
  dealUrl?: string
  source: 'GG_DEALS_API' | 'MOCK_ESTIMATE'
}

export interface PriceFetchResult {
  steam: SteamPriceResult | null
  keyshop: KeyshopPriceResult | null
  lastUpdated: Date
}

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000 // 12 heures

/**
 * Fetch official Steam price using Steam store API with filters=price_overview.
 */
export async function fetchSteamPrice(appId: string): Promise<SteamPriceResult | null> {
  if (!appId || !/^\d+$/.test(appId)) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&filters=price_overview`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LANSmith/1.0',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
        },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`[Steam Price API] HTTP ${response.status} for appId ${appId}`)
      return null
    }

    const json = await response.json()
    const appEntry = json[appId]

    if (!appEntry || !appEntry.success || !appEntry.data) {
      // Possible free-to-play with no price_overview or region locked
      return null
    }

    const data = appEntry.data

    if (data.is_free === true) {
      return {
        success: true,
        isFree: true,
        priceCents: 0,
        initialCents: 0,
        discountPercent: 0,
        currency: 'EUR',
        formatted: 'Gratuit'
      }
    }

    if (data.price_overview) {
      const po = data.price_overview
      return {
        success: true,
        isFree: false,
        priceCents: typeof po.final === 'number' ? po.final : null,
        initialCents: typeof po.initial === 'number' ? po.initial : null,
        discountPercent: typeof po.discount_percent === 'number' ? po.discount_percent : 0,
        currency: po.currency || 'EUR',
        formatted: po.final_formatted || undefined
      }
    }

    return null
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`[Steam Price API] Request timeout for appId ${appId}`)
    } else {
      console.warn(`[Steam Price API] Network error for appId ${appId}:`, error?.message || error)
    }
    return null
  }
}

/**
 * Fetch gray market / keyshop price.
 * Supports GG.deals API integration or extensible mock/estimation algorithm.
 */
export async function fetchKeyshopPrice(
  gameName: string,
  steamAppId?: string | null,
  steamPriceCents?: number | null
): Promise<KeyshopPriceResult | null> {
  const apiKey = process.env.GGDEALS_API_KEY || process.env.GG_DEALS_API_KEY

  // 1. Production integration with GG.deals API if API key is provided
  if (apiKey) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const queryParam = steamAppId ? `steamAppId=${steamAppId}` : `title=${encodeURIComponent(gameName)}`
      const res = await fetch(`https://api.gg.deals/v1/games?${queryParam}`, {
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const gameDeal = data.data?.[0]
        if (gameDeal && gameDeal.deals?.keyshop) {
          const keyshopDeal = gameDeal.deals.keyshop
          const priceCents = Math.round(Number(keyshopDeal.price) * 100)
          return {
            success: true,
            priceCents,
            shopName: keyshopDeal.shopName || 'Marché gris (GG.deals)',
            currency: keyshopDeal.currency || 'EUR',
            dealUrl: keyshopDeal.url,
            source: 'GG_DEALS_API'
          }
        }
      }
    } catch (err) {
      console.warn('[Keyshop / GG.deals API error]:', err)
    }
  }

  // 2. Extensible / local simulation when no API key is provided:
  // If Steam has a price, keyshop prices generally provide a competitive gray market discount (~15-30% off)
  if (steamPriceCents !== null && steamPriceCents !== undefined && steamPriceCents > 0) {
    // Calcul d'une estimation réaliste du marché gris pour la démo LAN
    const discountFactor = 0.72 // ~28% de réduction moyenne sur les revendeurs de clés
    const estimatedCents = Math.max(99, Math.round(steamPriceCents * discountFactor / 10) * 10 - 1) // termine par .99
    
    return {
      success: true,
      priceCents: estimatedCents,
      shopName: 'Meilleur revendeur de clés (estimation)',
      currency: 'EUR',
      dealUrl: steamAppId ? `https://gg.deals/game/${steamAppId}` : undefined,
      source: 'MOCK_ESTIMATE'
    }
  }

  return null
}

/**
 * Update prices for a game stored in DB, respecting the 12-hour cache unless forced.
 */
export async function updateGamePrices(
  gameId: string,
  options: { force?: boolean } = {}
) {
  const game = await prisma.game.findUnique({
    where: { id: gameId }
  })

  if (!game) {
    throw new Error(`Jeu introuvable avec l'ID ${gameId}`)
  }

  // Vérification de la validité du cache (12h)
  const now = new Date()
  if (
    !options.force &&
    game.priceUpdatedAt &&
    now.getTime() - new Date(game.priceUpdatedAt).getTime() < CACHE_DURATION_MS
  ) {
    return {
      game,
      cached: true,
      message: 'Prix issus du cache (mis à jour il y a moins de 12h)'
    }
  }

  let steamPriceCents = game.steamPriceCents
  let keyshopPriceCents = game.keyshopPriceCents
  let currency = game.currency || 'EUR'
  let acquisitionType = game.acquisitionType

  // 1. Fetch Steam Price if Steam App ID is known
  if (game.steamAppId) {
    const steamData = await fetchSteamPrice(game.steamAppId)
    if (steamData && steamData.success) {
      steamPriceCents = steamData.priceCents
      currency = steamData.currency || currency
      if (steamData.isFree && acquisitionType === 'STORE_BUY') {
        acquisitionType = 'FREE_TO_PLAY'
      }
    }
  }

  // 2. Fetch Keyshop Price
  const keyshopData = await fetchKeyshopPrice(game.name, game.steamAppId, steamPriceCents)
  if (keyshopData && keyshopData.success) {
    keyshopPriceCents = keyshopData.priceCents
  }

  // 3. Persist update in DB
  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      steamPriceCents,
      keyshopPriceCents,
      currency,
      acquisitionType,
      priceUpdatedAt: now
    }
  })

  return {
    game: updatedGame,
    cached: false,
    message: 'Prix actualisés avec succès'
  }
}

/**
 * Fetch external prices on-the-fly without saving, for preview in UI modals.
 */
export async function previewExternalPrices(steamAppId?: string | null, gameName: string = '') {
  let steamData: SteamPriceResult | null = null
  let keyshopData: KeyshopPriceResult | null = null

  if (steamAppId) {
    steamData = await fetchSteamPrice(steamAppId)
  }

  keyshopData = await fetchKeyshopPrice(gameName, steamAppId, steamData?.priceCents)

  return {
    steam: steamData,
    keyshop: keyshopData,
    fetchedAt: new Date().toISOString()
  }
}
