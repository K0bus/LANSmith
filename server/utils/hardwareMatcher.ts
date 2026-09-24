import { prisma } from './prisma';

export interface RigInput {
  cpuName: string;
  gpuName: string;
  ramGb: number;
  vramGb: number;
  cpuScore?: number;
  gpuScore?: number;
}

export interface HardwareGameRequirements {
  minCpuScore: number;
  recCpuScore: number;
  minGpuScore: number;
  recGpuScore: number;
  minRamGb: number;
  recRamGb: number;
  minVramGb: number;
  recVramGb: number;
}

export type HardwareCompatibilityStatus = 'OPTIMAL' | 'PASS' | 'MARGINAL' | 'FAIL';

export interface HardwareCompatibilityResult {
  status: HardwareCompatibilityStatus;
  gpuRatio: number; // gpuScore / minGpuScore
  cpuRatio: number; // cpuScore / minCpuScore
  bottleneck: 'GPU' | 'CPU' | 'RAM' | 'VRAM' | 'NONE';
  reasons: string[];
  recommendedSettings: 'HIGH_1440P' | 'MED_HIGH_1080P' | 'LOW_720P_30FPS' | 'UNPLAYABLE';
}

export interface BenchmarkRecord {
  id: string;
  name: string;
  normalized: string;
  score: number;
  tier: number;
  updatedAt: Date;
}

/**
 * Normalise une chaîne de caractères pour la recherche hardware
 * Minuscules, suppression de la ponctuation, des espaces et des préfixes constructeurs
 */
export function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(nvidia|geforce|amd|radeon|intel|processor|graphics|core|series)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Recherche un benchmark CPU ou GPU par correspondance exacte, sous-chaîne ou texte
 */
export async function findBenchmark(
  name: string,
  type: 'cpu' | 'gpu'
): Promise<BenchmarkRecord | null> {
  if (!name || !name.trim()) return null;

  const normalized = normalizeKey(name);
  const trimmed = name.trim();

  if (type === 'gpu') {
    // 1. Recherche par clé normalisée exacte
    if (normalized) {
      const exactNorm = await prisma.benchmarkGpu.findUnique({
        where: { normalized }
      });
      if (exactNorm) return exactNorm;

      // 2. Recherche par nom exact
      const exactName = await prisma.benchmarkGpu.findUnique({
        where: { name: trimmed }
      });
      if (exactName) return exactName;

      // 3. Recherche par sous-chaîne sur la clé normalisée
      const subNorm = await prisma.benchmarkGpu.findFirst({
        where: {
          normalized: {
            contains: normalized
          }
        },
        orderBy: { score: 'desc' }
      });
      if (subNorm) return subNorm;
    }

    // 4. Recherche large par nom
    const subName = await prisma.benchmarkGpu.findFirst({
      where: {
        name: {
          contains: trimmed
        }
      },
      orderBy: { score: 'desc' }
    });
    return subName;
  } else {
    // CPU
    // 1. Recherche par clé normalisée exacte
    if (normalized) {
      const exactNorm = await prisma.benchmarkCpu.findUnique({
        where: { normalized }
      });
      if (exactNorm) return exactNorm;

      // 2. Recherche par nom exact
      const exactName = await prisma.benchmarkCpu.findUnique({
        where: { name: trimmed }
      });
      if (exactName) return exactName;

      // 3. Recherche par sous-chaîne sur la clé normalisée
      const subNorm = await prisma.benchmarkCpu.findFirst({
        where: {
          normalized: {
            contains: normalized
          }
        },
        orderBy: { score: 'desc' }
      });
      if (subNorm) return subNorm;
    }

    // 4. Recherche large par nom
    const subName = await prisma.benchmarkCpu.findFirst({
      where: {
        name: {
          contains: trimmed
        }
      },
      orderBy: { score: 'desc' }
    });
    return subName;
  }
}

/**
 * Évalue la compatibilité d'une configuration (Rig) avec les prérequis d'un jeu (HardwareGameRequirements)
 */
export function evaluateCompatibility(
  rig: {
    cpuScore: number;
    gpuScore: number;
    ramGb: number;
    vramGb: number;
    cpuName?: string;
    gpuName?: string;
  },
  gameReqs: HardwareGameRequirements
): HardwareCompatibilityResult {
  const reasons: string[] = [];

  // Bloquants stricts mémoire
  const hasRamFail = rig.ramGb < gameReqs.minRamGb;
  const hasVramFail = rig.vramGb < gameReqs.minVramGb;

  if (hasRamFail) {
    reasons.push(
      `RAM insuffisante : ${rig.ramGb} Go installés vs ${gameReqs.minRamGb} Go minimum requis.`
    );
  }

  if (hasVramFail) {
    reasons.push(
      `VRAM insuffisante : ${rig.vramGb} Go disponibles vs ${gameReqs.minVramGb} Go minimum requis.`
    );
  }

  // Calcul des ratios CPU et GPU par rapport au minimum requis
  const rawGpuRatio =
    gameReqs.minGpuScore > 0 ? rig.gpuScore / gameReqs.minGpuScore : rig.gpuScore > 0 ? 2.0 : 1.0;
  const rawCpuRatio =
    gameReqs.minCpuScore > 0 ? rig.cpuScore / gameReqs.minCpuScore : rig.cpuScore > 0 ? 2.0 : 1.0;

  const gpuRatio = Math.round(rawGpuRatio * 100) / 100;
  const cpuRatio = Math.round(rawCpuRatio * 100) / 100;
  const minRatio = Math.min(gpuRatio, cpuRatio);

  // Détermination du bottleneck matériel de calcul
  let perfBottleneck: 'GPU' | 'CPU' = gpuRatio <= cpuRatio ? 'GPU' : 'CPU';

  // 1. Cas d'échec strict (FAIL)
  if (hasRamFail || hasVramFail || minRatio < 0.85) {
    let finalBottleneck: 'GPU' | 'CPU' | 'RAM' | 'VRAM';
    if (hasRamFail && hasVramFail) {
      finalBottleneck = 'RAM';
    } else if (hasRamFail) {
      finalBottleneck = 'RAM';
    } else if (hasVramFail) {
      finalBottleneck = 'VRAM';
    } else {
      finalBottleneck = perfBottleneck;
      if (finalBottleneck === 'GPU') {
        reasons.push(
          `GPU trop faible : score ${rig.gpuScore} vs ${gameReqs.minGpuScore} minimum requis (ratio ${gpuRatio}x).`
        );
      } else {
        reasons.push(
          `CPU trop faible : score ${rig.cpuScore} vs ${gameReqs.minCpuScore} minimum requis (ratio ${cpuRatio}x).`
        );
      }
    }

    return {
      status: 'FAIL',
      gpuRatio,
      cpuRatio,
      bottleneck: finalBottleneck,
      reasons,
      recommendedSettings: 'UNPLAYABLE'
    };
  }

  // 2. Cas marginal (MARGINAL) : minRatio entre 0.85 et 1.0
  if (minRatio < 1.0) {
    if (gpuRatio < 1.0) {
      reasons.push(
        `GPU légèrement en deçà du minimum recommandé (score ${rig.gpuScore}/${gameReqs.minGpuScore}). Concessions graphiques nécessaires.`
      );
    }
    if (cpuRatio < 1.0) {
      reasons.push(
        `CPU légèrement sous la barre requise (score ${rig.cpuScore}/${gameReqs.minCpuScore}). Risque de chutes d'IPS.`
      );
    }

    return {
      status: 'MARGINAL',
      gpuRatio,
      cpuRatio,
      bottleneck: perfBottleneck,
      reasons,
      recommendedSettings: 'LOW_720P_30FPS'
    };
  }

  // 3. Vérification des scores recommandés (PASS vs OPTIMAL)
  const isGpuRec = gameReqs.recGpuScore <= 0 || rig.gpuScore >= gameReqs.recGpuScore;
  const isCpuRec = gameReqs.recCpuScore <= 0 || rig.cpuScore >= gameReqs.recCpuScore;
  const isRamRec = gameReqs.recRamGb <= 0 || rig.ramGb >= gameReqs.recRamGb;
  const isVramRec = gameReqs.recVramGb <= 0 || rig.vramGb >= gameReqs.recVramGb;

  if (isGpuRec && isCpuRec && isRamRec && isVramRec) {
    reasons.push('Configuration optimale : dépasse largement les prérequis recommandés.');
    return {
      status: 'OPTIMAL',
      gpuRatio,
      cpuRatio,
      bottleneck: 'NONE',
      reasons,
      recommendedSettings: 'HIGH_1440P'
    };
  }

  // Cas PASS (1080p stable, au-dessus du minimum mais sous le recommandé max)
  if (!isGpuRec) {
    reasons.push(
      `GPU suffisant pour 1080p (${rig.gpuScore} pts), mais inférieur à la recommandation Ultra (${gameReqs.recGpuScore} pts).`
    );
  }
  if (!isCpuRec) {
    reasons.push(
      `CPU suffisant pour 1080p (${rig.cpuScore} pts), mais inférieur à la recommandation Ultra (${gameReqs.recCpuScore} pts).`
    );
  }
  if (!isRamRec) {
    reasons.push(
      `RAM suffisante (${rig.ramGb} Go), mais 16+ Go recommandés pour un confort maximal.`
    );
  }
  if (!isVramRec) {
    reasons.push(
      `VRAM suffisante (${rig.vramGb} Go), mais ${gameReqs.recVramGb} Go recommandés pour textures Ultra.`
    );
  }

  if (reasons.length === 0) {
    reasons.push('Configuration conforme aux spécifications minimales et intermédiaire.');
  }

  let passBottleneck: 'GPU' | 'CPU' | 'RAM' | 'VRAM' | 'NONE' = 'NONE';
  if (!isGpuRec && isCpuRec) passBottleneck = 'GPU';
  else if (!isCpuRec && isGpuRec) passBottleneck = 'CPU';
  else if (!isRamRec && isGpuRec && isCpuRec) passBottleneck = 'RAM';
  else if (!isVramRec && isGpuRec && isCpuRec) passBottleneck = 'VRAM';

  return {
    status: 'PASS',
    gpuRatio,
    cpuRatio,
    bottleneck: passBottleneck,
    reasons,
    recommendedSettings: 'MED_HIGH_1080P'
  };
}
