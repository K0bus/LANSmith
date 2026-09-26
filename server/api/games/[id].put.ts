import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' });
  }

  const body = (await readBody(event)) || {};
  const name = body.name ? body.name.trim() : undefined;
  const slug = body.slug
    ? body.slug.trim()
    : name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : undefined;

  const steamAppId = body.steamAppId !== undefined ? (body.steamAppId ? String(body.steamAppId).trim() : null) : undefined;
  
  const steamPriceCents = body.steamPriceCents !== undefined
    ? (body.steamPriceCents === null ? null : Number(body.steamPriceCents))
    : body.steam_price_cents !== undefined
    ? (body.steam_price_cents === null ? null : Number(body.steam_price_cents))
    : undefined;

  const keyshopPriceCents = body.keyshopPriceCents !== undefined
    ? (body.keyshopPriceCents === null ? null : Number(body.keyshopPriceCents))
    : body.keyshop_price_cents !== undefined
    ? (body.keyshop_price_cents === null ? null : Number(body.keyshop_price_cents))
    : undefined;

  const keyshopUrl = body.keyshopUrl !== undefined
    ? (body.keyshopUrl?.trim() || null)
    : body.keyshop_url !== undefined
    ? (body.keyshop_url?.trim() || null)
    : undefined;

  const currency = body.currency !== undefined ? (body.currency?.trim() || 'EUR') : undefined;

  const acquisitionType = body.acquisitionType !== undefined
    ? (body.acquisitionType?.trim()?.toUpperCase() || 'STORE_BUY')
    : body.acquisition_type !== undefined
    ? (body.acquisition_type?.trim()?.toUpperCase() || 'STORE_BUY')
    : undefined;

  const friendDownloadUrl = body.friendDownloadUrl !== undefined
    ? (body.friendDownloadUrl?.trim() || null)
    : body.friend_download_url !== undefined
    ? (body.friend_download_url?.trim() || null)
    : undefined;

  const priceUpdatedAt = body.priceUpdatedAt !== undefined
    ? (body.priceUpdatedAt ? new Date(body.priceUpdatedAt) : null)
    : (steamPriceCents !== undefined || keyshopPriceCents !== undefined)
    ? new Date()
    : undefined;

  const updated = await prisma.game.update({
    where: { id },
    data: {
      name,
      slug,
      coverUrl: body.coverUrl !== undefined ? (body.coverUrl?.trim() || null) : undefined,
      summary: body.summary !== undefined ? (body.summary?.trim() || null) : undefined,
      genres: body.genres !== undefined ? (body.genres?.trim() || null) : undefined,
      steamAppId,
      steamPriceCents,
      keyshopPriceCents,
      keyshopUrl,
      currency,
      acquisitionType,
      friendDownloadUrl,
      priceUpdatedAt,
      minCpuScore: body.minCpuScore !== undefined ? Math.max(0, Number(body.minCpuScore)) : undefined,
      recCpuScore: body.recCpuScore !== undefined ? Math.max(0, Number(body.recCpuScore)) : undefined,
      minGpuScore: body.minGpuScore !== undefined ? Math.max(0, Number(body.minGpuScore)) : undefined,
      recGpuScore: body.recGpuScore !== undefined ? Math.max(0, Number(body.recGpuScore)) : undefined,
      minRamGb: body.minRamGb !== undefined ? Math.max(1, Number(body.minRamGb)) : undefined,
      recRamGb: body.recRamGb !== undefined ? Math.max(1, Number(body.recRamGb)) : undefined,
      minVramGb: body.minVramGb !== undefined ? Math.max(1, Number(body.minVramGb)) : undefined,
      recVramGb: body.recVramGb !== undefined ? Math.max(1, Number(body.recVramGb)) : undefined
    }
  });

  return updated;
});

