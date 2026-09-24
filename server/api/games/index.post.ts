import { defineEventHandler, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';

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

  const game = await prisma.game.create({
    data: {
      name,
      slug,
      igdbId,
      coverUrl: body.coverUrl?.trim() || null,
      summary: body.summary?.trim() || null,
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
