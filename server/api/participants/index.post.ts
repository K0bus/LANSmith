import { defineEventHandler, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';
import { normalizeKey, findBenchmark } from '../../utils/hardwareMatcher';

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) || {};

  const nickname = (body.nickname || body.name || '').trim();

  if (!nickname) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le pseudo du participant est obligatoire.'
    });
  }

  // Vérification de l'unicité du pseudo
  const existing = await prisma.participant.findUnique({
    where: { nickname }
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: `Un joueur avec le pseudo "${nickname}" existe déjà.`
    });
  }

  const cpuName = (body.cpuName || body.cpuModel || 'AMD Ryzen 5 5600X').trim();
  const gpuName = (body.gpuName || body.gpuModel || 'NVIDIA GeForce RTX 3060').trim();

  const cpuNormalized = normalizeKey(cpuName);
  const gpuNormalized = normalizeKey(gpuName);

  // Résolution automatique du score CPU si non fourni ou égal à 0
  let cpuScore = Number(body.cpuScore) || 0;
  if (cpuScore <= 0 && cpuName) {
    const cpuBench = await findBenchmark(cpuName, 'cpu');
    cpuScore = cpuBench ? cpuBench.score : 2500;
  }

  // Résolution automatique du score GPU si non fourni ou égal à 0
  let gpuScore = Number(body.gpuScore) || 0;
  if (gpuScore <= 0 && gpuName) {
    const gpuBench = await findBenchmark(gpuName, 'gpu');
    gpuScore = gpuBench ? gpuBench.score : 10000;
  }

  const vramGb = Math.max(1, Number(body.vramGb) || 8);
  const ramGb = Math.max(2, Number(body.ramGb) || 16);
  const os = (body.os || 'Windows 11').trim();
  const avatarUrl =
    body.avatarUrl ||
    body.avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname)}`;

  const participant = await prisma.participant.create({
    data: {
      nickname,
      avatarUrl,
      rig: {
        create: {
          cpuName,
          cpuNormalized,
          cpuScore,
          gpuName,
          gpuNormalized,
          gpuScore,
          vramGb,
          ramGb,
          os
        }
      }
    },
    include: {
      rig: true
    }
  });

  return participant;
});
