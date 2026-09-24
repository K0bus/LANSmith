/**
 * Hardware Normalization and Tier Helper (Tier 1 = Low-end/Ancient, Tier 10 = Flagship enthusiast)
 */

export interface GpuPreset {
  model: string
  tier: number
  typicalVramGb: number
  category: 'NVIDIA' | 'AMD' | 'Intel' | 'iGPU'
}

export interface CpuPreset {
  model: string
  tier: number
  category: 'Intel' | 'AMD' | 'Apple' | 'Old'
}

export const COMMON_GPUS: GpuPreset[] = [
  // Tier 10 (Ultra High-End)
  { model: 'NVIDIA GeForce RTX 4090', tier: 10, typicalVramGb: 24, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce RTX 4080 Super', tier: 10, typicalVramGb: 16, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 7900 XTX', tier: 10, typicalVramGb: 24, category: 'AMD' },
  
  // Tier 9 (High-End moderne)
  { model: 'NVIDIA GeForce RTX 4070 Ti Super', tier: 9, typicalVramGb: 16, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce RTX 4070 Super', tier: 9, typicalVramGb: 12, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 7800 XT', tier: 9, typicalVramGb: 16, category: 'AMD' },
  { model: 'NVIDIA GeForce RTX 3080 / 3080 Ti', tier: 9, typicalVramGb: 10, category: 'NVIDIA' },

  // Tier 8 (Mid-High moderne)
  { model: 'NVIDIA GeForce RTX 4060 Ti', tier: 8, typicalVramGb: 8, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce RTX 3070 / 3070 Ti', tier: 8, typicalVramGb: 8, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 6700 XT / 6750 XT', tier: 8, typicalVramGb: 12, category: 'AMD' },

  // Tier 7 (Mid-range standard 1080p/1440p)
  { model: 'NVIDIA GeForce RTX 4060', tier: 7, typicalVramGb: 8, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce RTX 3060 / 3060 Ti', tier: 7, typicalVramGb: 12, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 6600 XT', tier: 7, typicalVramGb: 8, category: 'AMD' },
  { model: 'NVIDIA GeForce RTX 2070 / 2080', tier: 7, typicalVramGb: 8, category: 'NVIDIA' },

  // Tier 6 (Entry Gamer moderne)
  { model: 'NVIDIA GeForce RTX 2060 / 2060 Super', tier: 6, typicalVramGb: 6, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce GTX 1660 Ti / Super', tier: 6, typicalVramGb: 6, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 5600 XT', tier: 6, typicalVramGb: 6, category: 'AMD' },
  { model: 'Intel Arc A750 / A770', tier: 6, typicalVramGb: 8, category: 'Intel' },

  // Tier 5 (Gamer classique 1080p)
  { model: 'NVIDIA GeForce GTX 1660', tier: 5, typicalVramGb: 6, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce GTX 1070 / 1070 Ti', tier: 5, typicalVramGb: 8, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 580 / RX 590', tier: 5, typicalVramGb: 8, category: 'AMD' },

  // Tier 4 (LAN Classique / E-sport léger)
  { model: 'NVIDIA GeForce GTX 1060 (6GB)', tier: 4, typicalVramGb: 6, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce GTX 1650 / 1650 Super', tier: 4, typicalVramGb: 4, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 570 / 480', tier: 4, typicalVramGb: 4, category: 'AMD' },

  // Tier 3 (Budget / Vieux PC)
  { model: 'NVIDIA GeForce GTX 1050 Ti', tier: 3, typicalVramGb: 4, category: 'NVIDIA' },
  { model: 'NVIDIA GeForce GTX 960 / 970', tier: 3, typicalVramGb: 4, category: 'NVIDIA' },
  { model: 'AMD Radeon RX 560 / 460', tier: 3, typicalVramGb: 4, category: 'AMD' },

  // Tier 2 (Très modeste / Laptop d'appoint)
  { model: 'NVIDIA GeForce GTX 750 Ti / MX450', tier: 2, typicalVramGb: 2, category: 'NVIDIA' },
  { model: 'AMD Radeon Vega 8 (iGPU Ryzen 5)', tier: 2, typicalVramGb: 2, category: 'iGPU' },
  { model: 'Intel Iris Xe Graphics', tier: 2, typicalVramGb: 2, category: 'iGPU' },

  // Tier 1 (Bureautique pure / Vintage)
  { model: 'Intel UHD Graphics 630 / 730', tier: 1, typicalVramGb: 1, category: 'iGPU' },
  { model: 'NVIDIA GeForce GT 710 / GT 1030', tier: 1, typicalVramGb: 2, category: 'NVIDIA' }
]

export const COMMON_CPUS: CpuPreset[] = [
  // Tier 10
  { model: 'AMD Ryzen 7 7800X3D / 9800X3D', tier: 10, category: 'AMD' },
  { model: 'Intel Core i9-13900K / 14900K', tier: 10, category: 'Intel' },
  { model: 'AMD Ryzen 9 7950X / 7900X', tier: 10, category: 'AMD' },

  // Tier 9
  { model: 'Intel Core i7-13700K / 14700K', tier: 9, category: 'Intel' },
  { model: 'AMD Ryzen 7 7700X', tier: 9, category: 'AMD' },
  { model: 'AMD Ryzen 7 5800X3D', tier: 9, category: 'AMD' },

  // Tier 8
  { model: 'Intel Core i5-13600K / 14600K', tier: 8, category: 'Intel' },
  { model: 'AMD Ryzen 5 7600X / 7600', tier: 8, category: 'AMD' },
  { model: 'Intel Core i7-12700K', tier: 8, category: 'Intel' },

  // Tier 7
  { model: 'AMD Ryzen 5 5600X / 5600', tier: 7, category: 'AMD' },
  { model: 'Intel Core i5-12400F / 13400F', tier: 7, category: 'Intel' },
  { model: 'AMD Ryzen 7 3700X / 3800X', tier: 7, category: 'AMD' },

  // Tier 6
  { model: 'AMD Ryzen 5 3600 / 3600X', tier: 6, category: 'AMD' },
  { model: 'Intel Core i5-10400F / 11400F', tier: 6, category: 'Intel' },
  { model: 'Intel Core i7-9700K', tier: 6, category: 'Intel' },

  // Tier 5
  { model: 'AMD Ryzen 5 2600 / 1600 AF', tier: 5, category: 'AMD' },
  { model: 'Intel Core i5-8400 / 9400F', tier: 5, category: 'Intel' },
  { model: 'Intel Core i7-7700K / 8700', tier: 5, category: 'Intel' },

  // Tier 4
  { model: 'Intel Core i5-7400 / 6500', tier: 4, category: 'Intel' },
  { model: 'AMD Ryzen 3 3200G / 2200G', tier: 4, category: 'AMD' },
  { model: 'Intel Core i7-4790K', tier: 4, category: 'Intel' },

  // Tier 3
  { model: 'Intel Core i5-4460 / 3570K', tier: 3, category: 'Intel' },
  { model: 'AMD FX-8350', tier: 3, category: 'AMD' },

  // Tier 2
  { model: 'Intel Core i3-4130 / 6100', tier: 2, category: 'Intel' },
  { model: 'Intel Pentium G4560', tier: 2, category: 'Intel' },

  // Tier 1
  { model: 'Intel Core 2 Duo / Quad', tier: 1, category: 'Old' },
  { model: 'Intel Celeron / Pentium Dual-Core', tier: 1, category: 'Old' }
]

export function guessGpuTierAndVram(gpuName: string): { tier: number; vramGb: number } {
  const normalized = gpuName.toLowerCase().trim()
  const found = COMMON_GPUS.find(g => normalized.includes(g.model.toLowerCase()) || g.model.toLowerCase().includes(normalized))
  if (found) {
    return { tier: found.tier, vramGb: found.typicalVramGb }
  }

  // Heuristics
  if (normalized.includes('4090') || normalized.includes('7900 xtx')) return { tier: 10, vramGb: 24 }
  if (normalized.includes('4080') || normalized.includes('4070 ti')) return { tier: 9, vramGb: 16 }
  if (normalized.includes('4070') || normalized.includes('3080') || normalized.includes('7800 xt')) return { tier: 9, vramGb: 12 }
  if (normalized.includes('3070') || normalized.includes('4060 ti') || normalized.includes('6700 xt')) return { tier: 8, vramGb: 8 }
  if (normalized.includes('3060') || normalized.includes('4060') || normalized.includes('6600')) return { tier: 7, vramGb: 8 }
  if (normalized.includes('2060') || normalized.includes('1660') || normalized.includes('5600 xt')) return { tier: 6, vramGb: 6 }
  if (normalized.includes('1070') || normalized.includes('580') || normalized.includes('590')) return { tier: 5, vramGb: 8 }
  if (normalized.includes('1060') || normalized.includes('1650') || normalized.includes('570')) return { tier: 4, vramGb: 4 }
  if (normalized.includes('1050') || normalized.includes('960')) return { tier: 3, vramGb: 4 }
  if (normalized.includes('vega') || normalized.includes('iris') || normalized.includes('750')) return { tier: 2, vramGb: 2 }
  
  return { tier: 4, vramGb: 4 }
}

export function guessCpuTier(cpuName: string): number {
  const normalized = cpuName.toLowerCase().trim()
  const found = COMMON_CPUS.find(c => normalized.includes(c.model.toLowerCase()) || c.model.toLowerCase().includes(normalized))
  if (found) {
    return found.tier
  }

  if (normalized.includes('7800x3d') || normalized.includes('14900k') || normalized.includes('13900k')) return 10
  if (normalized.includes('14700') || normalized.includes('13700') || normalized.includes('5800x3d') || normalized.includes('7700x')) return 9
  if (normalized.includes('13600') || normalized.includes('14600') || normalized.includes('7600x') || normalized.includes('12700')) return 8
  if (normalized.includes('5600x') || normalized.includes('12400') || normalized.includes('13400') || normalized.includes('3700x')) return 7
  if (normalized.includes('3600') || normalized.includes('10400') || normalized.includes('11400') || normalized.includes('9700k')) return 6
  if (normalized.includes('2600') || normalized.includes('8400') || normalized.includes('9400') || normalized.includes('7700k')) return 5
  if (normalized.includes('7400') || normalized.includes('6500') || normalized.includes('4790')) return 4
  if (normalized.includes('4460') || normalized.includes('3570')) return 3
  
  return 5
}
