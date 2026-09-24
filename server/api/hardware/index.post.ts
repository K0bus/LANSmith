import { defineEventHandler, readBody, createError } from 'h3';
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
  const body = (await readBody(event)) || {};

  if (!body.name || !body.name.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le nom du composant est obligatoire.'
    });
  }

  const type = (body.type || 'gpu').toLowerCase() as 'gpu' | 'cpu';
  const name = body.name.trim();
  const normalized = normalizeKey(name);
  const score = Math.max(1, Number(body.score) || 1000);
  const tier =
    body.tier && Number(body.tier) >= 1 && Number(body.tier) <= 5
      ? Number(body.tier)
      : type === 'gpu'
      ? calculateGpuTier(score)
      : calculateCpuTier(score);

  if (type === 'gpu') {
    const item = await prisma.benchmarkGpu.upsert({
      where: { normalized },
      update: {
        name,
        score,
        tier
      },
      create: {
        name,
        normalized,
        score,
        tier
      }
    });
    return { ...item, type: 'gpu' as const };
  } else {
    const item = await prisma.benchmarkCpu.upsert({
      where: { normalized },
      update: {
        name,
        score,
        tier
      },
      create: {
        name,
        normalized,
        score,
        tier
      }
    });
    return { ...item, type: 'cpu' as const };
  }
});
