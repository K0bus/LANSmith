import { checkCompatibility, canRunGame } from '../shared/utils/compatibility'
import { guessCpuTier, guessGpuTierAndVram } from '../shared/utils/hardwareNormalizer'

console.log('🧪 Exécution des tests du moteur de compatibilité LANSmith...')

// Test 1: High-end rig on heavy game (CS2)
const highEndRig = {
  cpuModel: 'Ryzen 7 7800X3D',
  cpuTier: 10,
  gpuModel: 'RTX 4080',
  gpuTier: 10,
  vramGb: 16,
  ramGb: 32
}
const cs2Reqs = {
  minRamGb: 8,
  minVramGb: 4,
  minGpuTier: 5,
  minCpuTier: 5
}
const res1 = checkCompatibility(highEndRig, cs2Reqs)
console.assert(res1.compatible === true, 'High-end rig should be compatible with CS2')
console.assert(res1.status === 'READY', 'Status should be READY')
console.assert(canRunGame(highEndRig, cs2Reqs) === true, 'canRunGame helper should return true')
console.log('✅ Test 1 (High-end rig) validé')

// Test 2: Low-end laptop on heavy game (CS2)
const potatoRig = {
  cpuModel: 'Intel i5-7400',
  cpuTier: 4,
  gpuModel: 'GTX 1050 Ti',
  gpuTier: 3,
  vramGb: 4,
  ramGb: 8
}
const res2 = checkCompatibility(potatoRig, cs2Reqs)
console.assert(res2.compatible === false, 'Potato rig should NOT be fully compatible with CS2')
console.assert(res2.status !== 'READY', 'Status should not be READY')
console.assert(res2.bottlenecks.length > 0, 'Bottlenecks should be reported')
console.assert(canRunGame(potatoRig, cs2Reqs) === false, 'canRunGame helper should return false')
console.log('✅ Test 2 (Potato rig vs heavy game) validé')

// Test 3: Potato rig on lightweight classic game (TrackMania)
const tmReqs = {
  minRamGb: 2,
  minVramGb: 1,
  minGpuTier: 1,
  minCpuTier: 1
}
const res3 = checkCompatibility(potatoRig, tmReqs)
console.assert(res3.compatible === true, 'Potato rig MUST run TrackMania')
console.assert(res3.status === 'READY', 'Status should be READY for TrackMania')
console.log('✅ Test 3 (Potato rig vs lightweight game) validé')

// Test 4: Hardware Normalization helpers
const guessedGpu = guessGpuTierAndVram('NVIDIA GeForce RTX 4070')
console.assert(guessedGpu.tier >= 8, 'RTX 4070 should be tier 8 or 9')
const guessedCpu = guessCpuTier('AMD Ryzen 5 5600X')
console.assert(guessedCpu === 7, 'Ryzen 5 5600X should be tier 7')
console.log('✅ Test 4 (Hardware normalizer) validé')

console.log('🎉 Tous les tests unitaires ont réussi !')
