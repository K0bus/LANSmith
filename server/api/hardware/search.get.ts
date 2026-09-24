import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '../../utils/prisma';
import { normalizeKey } from '../../utils/hardwareMatcher';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const type = (typeof query.type === 'string' ? query.type.toLowerCase() : 'all') as
    | 'cpu'
    | 'gpu'
    | 'all';
  const limit = Math.min(Math.max(parseInt(query.limit as string, 10) || 20, 1), 100);

  const normalizedQuery = normalizeKey(q);

  const searchGpus = type === 'gpu' || type === 'all';
  const searchCpus = type === 'cpu' || type === 'all';

  const [gpus, cpus] = await Promise.all([
    searchGpus
      ? prisma.benchmarkGpu.findMany({
          where: q
            ? {
                OR: [
                  { name: { contains: q } },
                  ...(normalizedQuery ? [{ normalized: { contains: normalizedQuery } }] : [])
                ]
              }
            : undefined,
          orderBy: { score: 'desc' },
          take: limit
        })
      : Promise.resolve([]),
    searchCpus
      ? prisma.benchmarkCpu.findMany({
          where: q
            ? {
                OR: [
                  { name: { contains: q } },
                  ...(normalizedQuery ? [{ normalized: { contains: normalizedQuery } }] : [])
                ]
              }
            : undefined,
          orderBy: { score: 'desc' },
          take: limit
        })
      : Promise.resolve([])
  ]);

  const formattedGpus = gpus.map((g) => ({
    type: 'gpu' as const,
    id: g.id,
    name: g.name,
    normalized: g.normalized,
    score: g.score,
    tier: g.tier
  }));

  const formattedCpus = cpus.map((c) => ({
    type: 'cpu' as const,
    id: c.id,
    name: c.name,
    normalized: c.normalized,
    score: c.score,
    tier: c.tier
  }));

  return {
    query: q,
    type,
    gpus: formattedGpus,
    cpus: formattedCpus,
    results: [...formattedGpus, ...formattedCpus]
  };
});
