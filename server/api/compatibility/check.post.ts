import { defineEventHandler, readBody, createError } from 'h3';
import { prisma } from '../../utils/prisma';
import {
  evaluateCompatibility,
  findBenchmark,
  type HardwareCompatibilityResult,
  type HardwareGameRequirements,
  type RigInput
} from '../../utils/hardwareMatcher';

interface CheckPayload {
  participantId?: string;
  gameId?: string;
  rig?: {
    cpuName?: string;
    cpuScore?: number;
    gpuName?: string;
    gpuScore?: number;
    ramGb?: number;
    vramGb?: number;
  };
  gameRequirements?: Partial<HardwareGameRequirements>;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<CheckPayload>(event)) || {};

  let participant = null;
  let game = null;

  let resolvedRig = {
    cpuName: 'Unknown CPU',
    cpuScore: 0,
    gpuName: 'Unknown GPU',
    gpuScore: 0,
    ramGb: 0,
    vramGb: 0
  };

  let resolvedReqs: HardwareGameRequirements = {
    minCpuScore: 0,
    recCpuScore: 0,
    minGpuScore: 0,
    recGpuScore: 0,
    minRamGb: 8,
    recRamGb: 16,
    minVramGb: 2,
    recVramGb: 6
  };

  // 1. Cas avec participantId et gameId
  if (body.participantId && body.gameId) {
    participant = await prisma.participant.findUnique({
      where: { id: body.participantId },
      include: { rig: true }
    });

    if (!participant) {
      throw createError({
        statusCode: 404,
        statusMessage: `Participant avec l'ID ${body.participantId} introuvable.`
      });
    }

    game = await prisma.game.findUnique({
      where: { id: body.gameId }
    });

    if (!game) {
      throw createError({
        statusCode: 404,
        statusMessage: `Jeu avec l'ID ${body.gameId} introuvable.`
      });
    }

    if (!participant.rig) {
      throw createError({
        statusCode: 400,
        statusMessage: `Le participant "${participant.nickname}" n'a pas encore configuré de Rig.`
      });
    }

    resolvedRig = {
      cpuName: participant.rig.cpuName,
      cpuScore: participant.rig.cpuScore,
      gpuName: participant.rig.gpuName,
      gpuScore: participant.rig.gpuScore,
      ramGb: participant.rig.ramGb,
      vramGb: participant.rig.vramGb
    };

    resolvedReqs = {
      minCpuScore: game.minCpuScore,
      recCpuScore: game.recCpuScore,
      minGpuScore: game.minGpuScore,
      recGpuScore: game.recGpuScore,
      minRamGb: game.minRamGb,
      recRamGb: game.recRamGb,
      minVramGb: game.minVramGb,
      recVramGb: game.recVramGb
    };
  } else if (body.rig && body.gameRequirements) {
    // 2. Cas avec rig et gameRequirements directs
    let cpuScore = body.rig.cpuScore;
    let gpuScore = body.rig.gpuScore;

    // Résolution automatique des scores si non fournis
    if ((!cpuScore || cpuScore <= 0) && body.rig.cpuName) {
      const cpuBench = await findBenchmark(body.rig.cpuName, 'cpu');
      cpuScore = cpuBench ? cpuBench.score : 0;
    }

    if ((!gpuScore || gpuScore <= 0) && body.rig.gpuName) {
      const gpuBench = await findBenchmark(body.rig.gpuName, 'gpu');
      gpuScore = gpuBench ? gpuBench.score : 0;
    }

    resolvedRig = {
      cpuName: body.rig.cpuName || 'Custom CPU',
      cpuScore: cpuScore || 0,
      gpuName: body.rig.gpuName || 'Custom GPU',
      gpuScore: gpuScore || 0,
      ramGb: body.rig.ramGb || 0,
      vramGb: body.rig.vramGb || 0
    };

    resolvedReqs = {
      minCpuScore: body.gameRequirements.minCpuScore ?? 0,
      recCpuScore: body.gameRequirements.recCpuScore ?? 0,
      minGpuScore: body.gameRequirements.minGpuScore ?? 0,
      recGpuScore: body.gameRequirements.recGpuScore ?? 0,
      minRamGb: body.gameRequirements.minRamGb ?? 8,
      recRamGb: body.gameRequirements.recRamGb ?? 16,
      minVramGb: body.gameRequirements.minVramGb ?? 2,
      recVramGb: body.gameRequirements.recVramGb ?? 6
    };
  } else {
    throw createError({
      statusCode: 400,
      statusMessage:
        'Veuillez fournir soit { participantId, gameId }, soit { rig, gameRequirements }.'
    });
  }

  // Évaluation de compatibilité
  const compatibilityResult: HardwareCompatibilityResult = evaluateCompatibility(resolvedRig, resolvedReqs);

  // Définition des badges pour le frontend Nuxt
  const badgeConfig = {
    OPTIMAL: {
      color: 'emerald',
      bgColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      label: 'Optimal (1440p+)',
      tag: '1440P+'
    },
    PASS: {
      color: 'sky',
      bgColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      label: 'Compatible (1080p)',
      tag: '1080P'
    },
    MARGINAL: {
      color: 'amber',
      bgColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      label: 'Marginal (720p 30fps)',
      tag: '720P/30'
    },
    FAIL: {
      color: 'rose',
      bgColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      label: 'Incompatible',
      tag: 'FAIL'
    }
  }[compatibilityResult.status];

  return {
    participant: participant
      ? {
          id: participant.id,
          nickname: participant.nickname,
          avatarUrl: participant.avatarUrl
        }
      : null,
    game: game
      ? {
          id: game.id,
          name: game.name,
          slug: game.slug,
          coverUrl: game.coverUrl
        }
      : null,
    rig: resolvedRig,
    gameRequirements: resolvedReqs,
    compatibility: compatibilityResult,
    badge: badgeConfig
  };
});
