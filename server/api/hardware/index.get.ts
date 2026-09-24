import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '../../utils/prisma';
import { normalizeKey } from '../../utils/hardwareMatcher';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  const type = (typeof query.type === 'string' ? query.type.toLowerCase() : 'all') as
    | 'gpu'
    | 'cpu'
    | 'all';
  const tier = query.tier ? parseInt(query.tier as string, 10) : undefined;
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(query.limit as string, 10) || 30), 100);
  const sortBy = (typeof query.sortBy === 'string' ? query.sortBy : 'score') as
    | 'score'
    | 'name'
    | 'tier';
  const order = (query.order === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

  const normalizedQuery = normalizeKey(q);

  const gpuWhere: any = {};
  const cpuWhere: any = {};

  if (q) {
    gpuWhere.OR = [
      { name: { contains: q } },
      ...(normalizedQuery ? [{ normalized: { contains: normalizedQuery } }] : [])
    ];
    cpuWhere.OR = [
      { name: { contains: q } },
      ...(normalizedQuery ? [{ normalized: { contains: normalizedQuery } }] : [])
    ];
  }

  if (tier && tier >= 1 && tier <= 5) {
    gpuWhere.tier = tier;
    cpuWhere.tier = tier;
  }

  // Count stats
  const [totalGpusInDb, totalCpusInDb, gpuStatsRaw, cpuStatsRaw] = await Promise.all([
    prisma.benchmarkGpu.count(),
    prisma.benchmarkCpu.count(),
    prisma.benchmarkGpu.aggregate({
      _avg: { score: true },
      _max: { score: true },
      _min: { score: true }
    }),
    prisma.benchmarkCpu.aggregate({
      _avg: { score: true },
      _max: { score: true },
      _min: { score: true }
    })
  ]);

  let items: any[] = [];
  let totalItems = 0;

  if (type === 'gpu') {
    const [gpus, count] = await Promise.all([
      prisma.benchmarkGpu.findMany({
        where: gpuWhere,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.benchmarkGpu.count({ where: gpuWhere })
    ]);
    items = gpus.map((g) => ({ ...g, type: 'gpu' as const }));
    totalItems = count;
  } else if (type === 'cpu') {
    const [cpus, count] = await Promise.all([
      prisma.benchmarkCpu.findMany({
        where: cpuWhere,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.benchmarkCpu.count({ where: cpuWhere })
    ]);
    items = cpus.map((c) => ({ ...c, type: 'cpu' as const }));
    totalItems = count;
  } else {
    // All
    const [gpus, cpus, countGpu, countCpu] = await Promise.all([
      prisma.benchmarkGpu.findMany({
        where: gpuWhere,
        orderBy: { [sortBy]: order },
        take: limit * 2
      }),
      prisma.benchmarkCpu.findMany({
        where: cpuWhere,
        orderBy: { [sortBy]: order },
        take: limit * 2
      }),
      prisma.benchmarkGpu.count({ where: gpuWhere }),
      prisma.benchmarkCpu.count({ where: cpuWhere })
    ]);

    const merged = [
      ...gpus.map((g) => ({ ...g, type: 'gpu' as const })),
      ...cpus.map((c) => ({ ...c, type: 'cpu' as const }))
    ];

    merged.sort((a, b) => {
      if (sortBy === 'name') {
        return order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const valA = a[sortBy] || 0;
      const valB = b[sortBy] || 0;
      return order === 'asc' ? valA - valB : valB - valA;
    });

    totalItems = countGpu + countCpu;
    items = merged.slice((page - 1) * limit, page * limit);
  }

  return {
    items,
    pagination: {
      page,
      limit,
      total: totalItems,
      totalPages: Math.ceil(totalItems / limit) || 1
    },
    stats: {
      totalGpus: totalGpusInDb,
      totalCpus: totalCpusInDb,
      avgGpuScore: Math.round(gpuStatsRaw._avg.score || 0),
      maxGpuScore: gpuStatsRaw._max.score || 0,
      avgCpuScore: Math.round(cpuStatsRaw._avg.score || 0),
      maxCpuScore: cpuStatsRaw._max.score || 0
    }
  };
});
