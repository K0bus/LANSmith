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

  const updated = await prisma.game.update({
    where: { id },
    data: {
      name,
      slug,
      coverUrl: body.coverUrl !== undefined ? (body.coverUrl?.trim() || null) : undefined,
      summary: body.summary !== undefined ? (body.summary?.trim() || null) : undefined,
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
