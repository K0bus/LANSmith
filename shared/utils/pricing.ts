import type { EffectivePrice, GameItem, AcquisitionType, PriceSource } from '../types'

/**
 * Formats an amount in cents to a human-readable currency string (e.g. 1999 -> "19,99 €").
 */
export function formatCentsToPrice(
  cents: number | null | undefined,
  currency: string = 'EUR'
): string {
  if (cents === null || cents === undefined) {
    return 'Non communiqué'
  }
  if (cents === 0) {
    return '0,00 €'
  }

  const amount = cents / 100
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

/**
 * Normalizes a game name into a clean URL slug (e.g. "Among Us" -> "among-us", "Left 4 Dead 2" -> "left-4-dead-2").
 */
export function slugifyGameName(name: string): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Calculates the effective price, source label, store links, savings and display formatting for a game.
 * Supports both camelCase and snake_case properties for compatibility.
 */
export function getEffectivePrice(
  game: Partial<GameItem> | Record<string, any> | null | undefined
): EffectivePrice {
  if (!game) {
    return {
      is_free: false,
      display_price: 'N/A',
      raw_cents: null,
      currency: 'EUR',
      source: 'UNAVAILABLE',
      source_label: 'Indisponible',
      steam_url: null,
      keyshop_url: null
    }
  }

  const currency = game.currency || 'EUR'
  const rawAcquisition = (game.acquisitionType || game.acquisition_type || 'STORE_BUY') as string
  const acquisitionType = rawAcquisition.toUpperCase()
  const friendDownloadUrl = (game.friendDownloadUrl || game.friend_download_url || null) as string | null
  const steamAppId = (game.steamAppId || game.steam_app_id || null) as string | null
  const customKeyshopUrl = (game.keyshopUrl || game.keyshop_url || null) as string | null
  const gameName = game.name || ''
  const gameSlug = game.slug || (gameName ? slugifyGameName(gameName) : '')

  const lastUpdated = game.priceUpdatedAt || game.price_updated_at
    ? new Date(game.priceUpdatedAt || game.price_updated_at).toISOString()
    : null

  const steamCents =
    game.steamPriceCents !== undefined && game.steamPriceCents !== null
      ? Number(game.steamPriceCents)
      : game.steam_price_cents !== undefined && game.steam_price_cents !== null
      ? Number(game.steam_price_cents)
      : null

  const keyshopCents =
    game.keyshopPriceCents !== undefined && game.keyshopPriceCents !== null
      ? Number(game.keyshopPriceCents)
      : game.keyshop_price_cents !== undefined && game.keyshop_price_cents !== null
      ? Number(game.keyshop_price_cents)
      : null

  const steamFormatted = steamCents !== null ? formatCentsToPrice(steamCents, currency) : null
  const keyshopFormatted = keyshopCents !== null ? formatCentsToPrice(keyshopCents, currency) : null

  // Generated Store URLs
  const steamUrl = steamAppId ? `https://store.steampowered.com/app/${steamAppId}` : null
  const keyshopUrl =
    customKeyshopUrl ||
    (gameSlug ? `https://gg.deals/game/${gameSlug}/` : (gameName ? `https://gg.deals/games/?title=${encodeURIComponent(gameName)}` : null))

  // 1. FREE TO PLAY
  if (acquisitionType === 'FREE_TO_PLAY') {
    return {
      is_free: true,
      display_price: '0,00 €',
      raw_cents: 0,
      currency,
      source: 'FREE_TO_PLAY',
      source_label: 'Free-to-Play',
      steam_price_formatted: steamFormatted,
      keyshop_price_formatted: keyshopFormatted,
      steam_url: steamUrl,
      keyshop_url: keyshopUrl,
      friend_download_url: friendDownloadUrl,
      last_updated: lastUpdated
    }
  }

  // 2. FRIEND SHARE (Free for the group via internal / shared storage)
  if (acquisitionType === 'FRIEND_SHARE') {
    return {
      is_free: true,
      display_price: '0,00 €',
      raw_cents: 0,
      currency,
      source: 'FRIEND_SHARE',
      source_label: 'Partage entre amis',
      steam_price_formatted: steamFormatted,
      keyshop_price_formatted: keyshopFormatted,
      steam_url: steamUrl,
      keyshop_url: keyshopUrl,
      friend_download_url: friendDownloadUrl,
      last_updated: lastUpdated
    }
  }

  // 3. STORE BUY (Compare Steam vs Keyshop)
  if (steamCents !== null && keyshopCents !== null) {
    if (keyshopCents < steamCents) {
      const savingsCents = steamCents - keyshopCents
      const savingsPercent = steamCents > 0 ? Math.round((savingsCents / steamCents) * 100) : 0
      return {
        is_free: keyshopCents === 0,
        display_price: formatCentsToPrice(keyshopCents, currency),
        raw_cents: keyshopCents,
        currency,
        source: 'KEYSHOP',
        source_label: 'Clé revendeur',
        steam_price_formatted: steamFormatted,
        keyshop_price_formatted: keyshopFormatted,
        steam_url: steamUrl,
        keyshop_url: keyshopUrl,
        savings_cents: savingsCents,
        savings_percent: savingsPercent,
        friend_download_url: friendDownloadUrl,
        last_updated: lastUpdated
      }
    } else {
      return {
        is_free: steamCents === 0,
        display_price: formatCentsToPrice(steamCents, currency),
        raw_cents: steamCents,
        currency,
        source: 'STEAM',
        source_label: 'Steam',
        steam_price_formatted: steamFormatted,
        keyshop_price_formatted: keyshopFormatted,
        steam_url: steamUrl,
        keyshop_url: keyshopUrl,
        savings_cents: 0,
        savings_percent: 0,
        friend_download_url: friendDownloadUrl,
        last_updated: lastUpdated
      }
    }
  }

  if (steamCents !== null) {
    return {
      is_free: steamCents === 0,
      display_price: formatCentsToPrice(steamCents, currency),
      raw_cents: steamCents,
      currency,
      source: 'STEAM',
      source_label: 'Steam',
      steam_price_formatted: steamFormatted,
      keyshop_price_formatted: keyshopFormatted,
      steam_url: steamUrl,
      keyshop_url: keyshopUrl,
      friend_download_url: friendDownloadUrl,
      last_updated: lastUpdated
    }
  }

  if (keyshopCents !== null) {
    return {
      is_free: keyshopCents === 0,
      display_price: formatCentsToPrice(keyshopCents, currency),
      raw_cents: keyshopCents,
      currency,
      source: 'KEYSHOP',
      source_label: 'Clé revendeur',
      steam_price_formatted: steamFormatted,
      keyshop_price_formatted: keyshopFormatted,
      steam_url: steamUrl,
      keyshop_url: keyshopUrl,
      friend_download_url: friendDownloadUrl,
      last_updated: lastUpdated
    }
  }

  return {
    is_free: false,
    display_price: 'Prix non renseigné',
    raw_cents: null,
    currency,
    source: 'UNAVAILABLE',
    source_label: 'Prix non renseigné',
    steam_price_formatted: null,
    keyshop_price_formatted: null,
    steam_url: steamUrl,
    keyshop_url: keyshopUrl,
    friend_download_url: friendDownloadUrl,
    last_updated: lastUpdated
  }
}
