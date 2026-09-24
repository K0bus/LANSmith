import { defineEventHandler, getRouterParam, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';
import { normalizeKey, findBenchmark } from '../../utils/hardwareMatcher';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID manquant' });
  }

  const body = (await readBody(event)) || {};
  const nickname = (body.nickname || body.name || '').trim();

  // Si le pseudo est modifié, vérifier qu'il n'est pas déjà pris
  if (nickname) {
    const existing = await prisma.participant.findFirst({
      where: {
        nickname,
        NOT: { id }
      }
    });

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `Un joueur avec le pseudo "${nickname}" existe déjà.`
      });
    }
  }

  const rigData = body.rig || body;
  let cpuName = rigData.cpuName || rigData.cpuModel;
  let gpuName = rigData.gpuName || rigData.gpuModel;
  let cpuScore = Number(rigData.cpuScore) || 0;
  let gpuScore = Number(rigData.gpuScore) || 0;

  if (cpuName) {
    cpuName = cpuName.trim();
    if (cpuScore <= 0) {
      const cpuBench = await findBenchmark(cpuName, 'cpu');
      cpuScore = cpuBench ? cpuBench.score : 2500;
    }
  }

  if (gpuName) {
    gpuName = gpuName.trim();
    if (gpuScore <= 0) {
      const gpuBench = await findBenchmark(gpuName, 'gpu');
      gpuScore = gpuBench ? gpuBench.score : 10000;
    }
  }

  const cpuNormalized = cpuName ? normalizeKey(cpuName) : undefined;
  const gpuNormalized = gpuName ? normalizeKey(gpuName) : undefined;
  const vramGb = rigData.vramGb !== undefined ? Math.max(1, Number(rigData.vramGb)) : undefined;
  const ramGb = rigData.ramGb !== undefined ? Math.max(2, Number(rigData.ramGb)) : undefined;
  const os = rigData.os ? rigData.os.trim() : undefined;
  const avatarUrl = body.avatarUrl || body.avatar;

  const updated = await prisma.participant.update({
    where: { id },
    data: {
      nickname: nickname || undefined,
      avatarUrl: avatarUrl || undefined,
      rig: {
        upsert: {
          create: {
            cpuName: cpuName || 'AMD Ryzen 5 5600X',
            cpuNormalized: cpuNormalized || 'ryzen55600x',
            cpuScore: cpuScore || 2500,
            gpuName: gpuName || 'NVIDIA GeForce RTX 3060',
            gpuNormalized: gpuNormalized || 'rtx3060',
            gpuScore: gpuScore || 10000,
            vramGb: vramGb || 8,
            ramGb: ramGb || 16,
            os: os || 'Windows 11'
          },
          update: {
            cpuName: cpuName || undefined,
            cpuNormalized: cpuNormalized || undefined,
            cpuScore: cpuScore > 0 ? cpuScore : undefined,
            gpuName: gpuName || undefined,
            gpuNormalized: gpuNormalized || undefined,
            gpuScore: gpuScore > 0 ? gpuScore : undefined,
            vramGb: vramGb || undefined,
            ramGb: ramGb || undefined,
            os: os || undefined
          }
        }
      }
    },
    include: {
      rig: true
    }
  });

  return updated;
});
