import type { RigSpecs, GameRequirements, CompatibilityResult, CompatibilityStatus, ComponentCheck } from '../types'

/**
 * Pure strict compatibility algorithm for checking if a participant's rig
 * can run a given game based on RAM, VRAM, GPU Tier, and CPU Tier.
 * 
 * Rules:
 * - RAM: rig.ramGb >= game.minRamGb
 * - VRAM: rig.vramGb >= game.minVramGb
 * - GPU: rig.gpuTier >= game.minGpuTier
 * - CPU: rig.cpuTier >= game.minCpuTier
 */
export function checkCompatibility(
  rig: RigSpecs,
  requirements: GameRequirements
): CompatibilityResult {
  const bottlenecks: string[] = []
  
  // 1. RAM Check
  const ramPassed = rig.ramGb >= requirements.minRamGb
  const ramDiff = rig.ramGb - requirements.minRamGb
  const ramCheck: ComponentCheck = {
    passed: ramPassed,
    label: 'RAM Système',
    required: requirements.minRamGb,
    current: rig.ramGb,
    unit: 'Go',
    severity: ramPassed ? 'OK' : (ramDiff >= -2 ? 'WARN' : 'FAIL')
  }
  if (!ramPassed) {
    bottlenecks.push(`RAM insuffisante (${rig.ramGb} Go / ${requirements.minRamGb} Go requis)`)
  }

  // 2. VRAM Check
  const vramPassed = rig.vramGb >= requirements.minVramGb
  const vramDiff = rig.vramGb - requirements.minVramGb
  const vramCheck: ComponentCheck = {
    passed: vramPassed,
    label: 'VRAM GPU',
    required: requirements.minVramGb,
    current: rig.vramGb,
    unit: 'Go',
    severity: vramPassed ? 'OK' : (vramDiff >= -2 ? 'WARN' : 'FAIL')
  }
  if (!vramPassed) {
    bottlenecks.push(`VRAM GPU insuffisante (${rig.vramGb} Go / ${requirements.minVramGb} Go requis)`)
  }

  // 3. GPU Tier Check
  const gpuPassed = rig.gpuTier >= requirements.minGpuTier
  const gpuDiff = rig.gpuTier - requirements.minGpuTier
  const gpuCheck: ComponentCheck = {
    passed: gpuPassed,
    label: `GPU (${rig.gpuModel || 'Tier'})`,
    required: requirements.minGpuTier,
    current: rig.gpuTier,
    unit: 'Tier',
    severity: gpuPassed ? 'OK' : (gpuDiff >= -1 ? 'WARN' : 'FAIL')
  }
  if (!gpuPassed) {
    bottlenecks.push(`Puissance GPU insuffisante (${rig.gpuModel} - Tier ${rig.gpuTier} / Tier ${requirements.minGpuTier} requis)`)
  }

  // 4. CPU Tier Check
  const cpuPassed = rig.cpuTier >= requirements.minCpuTier
  const cpuDiff = rig.cpuTier - requirements.minCpuTier
  const cpuCheck: ComponentCheck = {
    passed: cpuPassed,
    label: `CPU (${rig.cpuModel || 'Tier'})`,
    required: requirements.minCpuTier,
    current: rig.cpuTier,
    unit: 'Tier',
    severity: cpuPassed ? 'OK' : (cpuDiff >= -1 ? 'WARN' : 'FAIL')
  }
  if (!cpuPassed) {
    bottlenecks.push(`Puissance CPU insuffisante (${rig.cpuModel} - Tier ${rig.cpuTier} / Tier ${requirements.minCpuTier} requis)`)
  }

  // Strict compatibility calculation
  const passedCount = (ramPassed ? 1 : 0) + (vramPassed ? 1 : 0) + (gpuPassed ? 1 : 0) + (cpuPassed ? 1 : 0)
  const scorePercent = Math.round((passedCount / 4) * 100)
  const fullyCompatible = passedCount === 4

  let status: CompatibilityStatus = 'INSUFFICIENT'
  if (fullyCompatible) {
    status = 'READY'
  } else if (passedCount >= 3) {
    status = 'WARNING'
  }

  return {
    compatible: fullyCompatible,
    status,
    scorePercent,
    bottlenecks,
    details: {
      ram: ramCheck,
      vram: vramCheck,
      gpu: gpuCheck,
      cpu: cpuCheck
    }
  }
}

/**
 * Quick boolean check matching the prompt signature canRunGame(rig, game)
 */
export function canRunGame(
  rig: { ramGb: number; vramGb: number; gpuTier: number; cpuTier: number },
  game: { minRamGb: number; minVramGb: number; minGpuTier: number; minCpuTier: number }
): boolean {
  return (
    rig.ramGb >= game.minRamGb &&
    rig.vramGb >= game.minVramGb &&
    rig.gpuTier >= game.minGpuTier &&
    rig.cpuTier >= game.minCpuTier
  )
}
