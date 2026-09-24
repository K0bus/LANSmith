import { defineEventHandler } from 'h3';
import { prisma } from '../../utils/prisma';
import {
  evaluateCompatibility,
  type HardwareCompatibilityResult,
  type HardwareGameRequirements
} from '../../utils/hardwareMatcher';

export default defineEventHandler(async () => {
  const [participants, games] = await Promise.all([
    prisma.participant.findMany({
      include: { rig: true },
      orderBy: { nickname: 'asc' }
    }),
    prisma.game.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  // Matrix: participantId -> gameId -> HardwareCompatibilityResult & Badge
  const matrix: Record<
    string,
    Record<
      string,
      HardwareCompatibilityResult & {
        compatible: boolean;
        badge: {
          color: string;
          bgColor: string;
          label: string;
          tag: string;
        };
      }
    >
  > = {};

  // Game stats: gameId -> { compatibleCount, totalParticipants, percentReady, is100PercentReady }
  const gameStats: Record<
    string,
    {
      gameId: string;
      gameName: string;
      compatibleCount: number;
      optimalCount: number;
      totalParticipants: number;
      percentReady: number;
      is100PercentReady: boolean;
    }
  > = {};

  // Initialize gameStats
  for (const game of games) {
    gameStats[game.id] = {
      gameId: game.id,
      gameName: game.name,
      compatibleCount: 0,
      optimalCount: 0,
      totalParticipants: participants.length,
      percentReady: 0,
      is100PercentReady: false
    };
  }

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
  };

  // Calculate compatibility for each participant and game
  for (const participant of participants) {
    matrix[participant.id] = {};

    const rig = participant.rig || {
      cpuName: 'Non renseigné',
      cpuScore: 0,
      gpuName: 'Non renseigné',
      gpuScore: 0,
      vramGb: 1,
      ramGb: 2,
      os: 'Inconnu'
    };

    for (const game of games) {
      const requirements: HardwareGameRequirements = {
        minCpuScore: game.minCpuScore,
        recCpuScore: game.recCpuScore,
        minGpuScore: game.minGpuScore,
        recGpuScore: game.recGpuScore,
        minRamGb: game.minRamGb,
        recRamGb: game.recRamGb,
        minVramGb: game.minVramGb,
        recVramGb: game.recVramGb
      };

      const result = evaluateCompatibility(rig, requirements);
      const isPlayable = result.status === 'OPTIMAL' || result.status === 'PASS';

      matrix[participant.id][game.id] = {
        ...result,
        compatible: isPlayable,
        badge: badgeConfig[result.status]
      };

      if (isPlayable) {
        gameStats[game.id].compatibleCount++;
      }
      if (result.status === 'OPTIMAL') {
        gameStats[game.id].optimalCount++;
      }
    }
  }

  // Compute final percentages
  const totalP = participants.length || 1;
  for (const gameId in gameStats) {
    const count = gameStats[gameId].compatibleCount;
    const pct = Math.round((count / totalP) * 100);
    gameStats[gameId].percentReady = pct;
    gameStats[gameId].is100PercentReady =
      count === participants.length && participants.length > 0;
  }

  const lanReadyGames = games.filter((g) => gameStats[g.id]?.is100PercentReady);

  return {
    participants,
    games,
    matrix,
    gameStats,
    summary: {
      totalParticipants: participants.length,
      totalGames: games.length,
      lanReadyCount: lanReadyGames.length,
      lanReadyGames
    }
  };
});
