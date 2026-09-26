import { defineEventHandler, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';
import { fetchSteamPrice, fetchKeyshopPrice } from '../../utils/pricingService';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) || {};

  if (!body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le nom du jeu est obligatoire.'
    });
  }

  const name = body.name.trim();
  const slug =
    (body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) ||
    'game-' + Date.now();

  const igdbId = body.igdbId ? Number(body.igdbId) : Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

  // Vérifier si un jeu avec cet igdbId existe déjà
  const existing = await prisma.game.findUnique({
    where: { igdbId }
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Un jeu avec cet identifiant IGDB (${igdbId}) est déjà présent dans la base.`
    });
  }

  const steamAppId = body.steamAppId ? String(body.steamAppId).trim() : null;
  let steamPriceCents = body.steamPriceCents !== undefined && body.steamPriceCents !== null
    ? Number(body.steamPriceCents)
    : body.steam_price_cents !== undefined && body.steam_price_cents !== null
    ? Number(body.steam_price_cents)
    : null;

  let keyshopPriceCents = body.keyshopPriceCents !== undefined && body.keyshopPriceCents !== null
    ? Number(body.keyshopPriceCents)
    : body.keyshop_price_cents !== undefined && body.keyshop_price_cents !== null
    ? Number(body.keyshop_price_cents)
    : null;

  let currency = (body.currency || 'EUR').trim();
  let acquisitionType = (body.acquisitionType || body.acquisition_type || 'STORE_BUY').trim().toUpperCase();
  const friendDownloadUrl = body.friendDownloadUrl?.trim() || body.friend_download_url?.trim() || null;
  let priceUpdatedAt = null;

  // Si un steamAppId est renseigné et que les prix ne sont pas fournis, on tente de les récupérer
  if (steamAppId && steamPriceCents === null) {
    try {
      const steamData = await fetchSteamPrice(steamAppId);
      if (steamData && steamData.success) {
        steamPriceCents = steamData.priceCents;
        currency = steamData.currency || currency;
        if (steamData.isFree && acquisitionType === 'STORE_BUY') {
          acquisitionType = 'FREE_TO_PLAY';
        }
      }
      const keyshopData = await fetchKeyshopPrice(name, steamAppId, steamPriceCents);
      if (keyshopData && keyshopData.success) {
        keyshopPriceCents = keyshopData.priceCents;
      }
      priceUpdatedAt = new Date();
    } catch (err) {
      console.warn('[Auto Price Fetch during game creation error]', err);
    }
  } else if (steamPriceCents !== null || keyshopPriceCents !== null) {
    priceUpdatedAt = new Date();
  }

  const game = await prisma.game.create({
    data: {
      name,
      slug,
      igdbId,
      coverUrl: body.coverUrl?.trim() || null,
      summary: body.summary?.trim() || null,
      genres: body.genres?.trim() || null,
      steamAppId,
      steamPriceCents,
      keyshopPriceCents,
      currency,
      acquisitionType,
      friendDownloadUrl,
      priceUpdatedAt,
      minCpuScore: Math.max(0, Number(body.minCpuScore) || 0),
      recCpuScore: Math.max(0, Number(body.recCpuScore) || 0),
      minGpuScore: Math.max(0, Number(body.minGpuScore) || 0),
      recGpuScore: Math.max(0, Number(body.recGpuScore) || 0),
      minRamGb: Math.max(1, Number(body.minRamGb) || 8),
      recRamGb: Math.max(1, Number(body.recRamGb) || 16),
      minVramGb: Math.max(1, Number(body.minVramGb) || 2),
      recVramGb: Math.max(1, Number(body.recVramGb) || 6)
    }
  });

  return game;
});

