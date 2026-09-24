import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';
import { normalizeKey } from '../../utils/hardwareMatcher';

function calculateGpuTier(score: number): number {
  if (score >= 20000) return 5;
  if (score >= 12000) return 4;
  if (score >= 6000) return 3;
  if (score >= 3500) return 2;
  return 1;
}

function calculateCpuTier(score: number): number {
  if (score >= 4200) return 5;
  if (score >= 3400) return 4;
  if (score >= 2700) return 3;
  if (score >= 2000) return 2;
  return 1;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' });
  }

  const body = (await readBody(event)) || {};
  const type = (body.type || 'gpu').toLowerCase() as 'gpu' | 'cpu';
  const name = body.name ? body.name.trim() : undefined;
  const score = body.score !== undefined ? Math.max(1, Number(body.score)) : undefined;
  const normalized = name ? normalizeKey(name) : undefined;

  let tier = body.tier ? Number(body.tier) : undefined;
  if (tier === undefined && score !== undefined) {
    tier = type === 'gpu' ? calculateGpuTier(score) : calculateCpuTier(score);
  }

  if (type === 'gpu') {
    const updated = await prisma.benchmarkGpu.update({
      where: { id },
      data: {
        name,
        normalized,
        score,
        tier
      }
    });
    return { ...updated, type: 'gpu' as const };
  } else {
    const updated = await prisma.benchmarkCpu.update({
      where: { id },
      data: {
        name,
        normalized,
        score,
        tier
      }
    });
    return { ...updated, type: 'cpu' as const };
  }
});
