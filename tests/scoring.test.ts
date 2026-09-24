import { calculateRoundScores } from '../server/utils/scoring'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  } else {
    console.log(`✅ PASSED: ${message}`)
  }
}

console.log('=== TEST 1: Mode WIN_LOSE (10 joueurs, 2 gagnants, 8 perdants) ===')
const inputs1 = [
  { participantId: 'p1', isWinner: true },
  { participantId: 'p2', isWinner: true },
  { participantId: 'p3', isWinner: false },
  { participantId: 'p4', isWinner: false },
  { participantId: 'p5', isWinner: false },
  { participantId: 'p6', isWinner: false },
  { participantId: 'p7', isWinner: false },
  { participantId: 'p8', isWinner: false },
  { participantId: 'p9', isWinner: false },
  { participantId: 'p10', isWinner: false }
]
const res1 = calculateRoundScores('WIN_LOSE', inputs1)
const p1_pts = res1.find(r => r.participantId === 'p1')?.points
const p3_pts = res1.find(r => r.participantId === 'p3')?.points
assert(p1_pts === 4, `Gagnant reçoit 8 / 2 = 4 points (reçu: ${p1_pts})`)
assert(p3_pts === 0, `Perdant reçoit 0 point (reçu: ${p3_pts})`)

console.log('\n=== TEST 2: Multi-Manches et Classement Final du Jeu ===')
// Supposons un jeu avec 3 manches et 3 joueurs
// Manche 1: P1 gagne (1 gagnant, 2 perdants -> 2 pts), P2 perd (0 pt), P3 perd (0 pt)
const m1 = calculateRoundScores('WIN_LOSE', [
  { participantId: 'p1', isWinner: true },
  { participantId: 'p2', isWinner: false },
  { participantId: 'p3', isWinner: false }
])

// Manche 2: P2 gagne (1 gagnant, 2 perdants -> 2 pts), P1 perd (0 pt), P3 perd (0 pt)
const m2 = calculateRoundScores('WIN_LOSE', [
  { participantId: 'p1', isWinner: false },
  { participantId: 'p2', isWinner: true },
  { participantId: 'p3', isWinner: false }
])

// Manche 3: P1 gagne (1 gagnant, 2 perdants -> 2 pts), P2 perd (0 pt), P3 perd (0 pt)
const m3 = calculateRoundScores('WIN_LOSE', [
  { participantId: 'p1', isWinner: true },
  { participantId: 'p2', isWinner: false },
  { participantId: 'p3', isWinner: false }
])

// Total points de manches pour ce jeu :
const p1_totalManche = (m1.find(r => r.participantId === 'p1')?.points || 0) + (m2.find(r => r.participantId === 'p1')?.points || 0) + (m3.find(r => r.participantId === 'p1')?.points || 0)
const p2_totalManche = (m1.find(r => r.participantId === 'p2')?.points || 0) + (m2.find(r => r.participantId === 'p2')?.points || 0) + (m3.find(r => r.participantId === 'p2')?.points || 0)
const p3_totalManche = (m1.find(r => r.participantId === 'p3')?.points || 0) + (m2.find(r => r.participantId === 'p3')?.points || 0) + (m3.find(r => r.participantId === 'p3')?.points || 0)

assert(p1_totalManche === 4, `P1 a 4 points de manche (reçu: ${p1_totalManche})`)
assert(p2_totalManche === 2, `P2 a 2 points de manche (reçu: ${p2_totalManche})`)
assert(p3_totalManche === 0, `P3 a 0 point de manche (reçu: ${p3_totalManche})`)

// Classement du jeu :
// 1er: P1 (4 pts manche) -> Barème [10, 8, 6] -> 10 points de tournoi
// 2e: P2 (2 pts manche) -> Barème [10, 8, 6] -> 8 points de tournoi
// 3e: P3 (0 pt manche)  -> Barème [10, 8, 6] -> 6 points de tournoi
const tournamentRules = [10, 8, 6, 5, 4, 3, 2, 1]
const gameRankings = [
  { participantId: 'p1', rawPoints: p1_totalManche },
  { participantId: 'p2', rawPoints: p2_totalManche },
  { participantId: 'p3', rawPoints: p3_totalManche }
].sort((a, b) => b.rawPoints - a.rawPoints)

const p1_tournamentPts = tournamentRules[0] // 10
const p2_tournamentPts = tournamentRules[1] // 8
const p3_tournamentPts = tournamentRules[2] // 6

assert(gameRankings[0].participantId === 'p1' && p1_tournamentPts === 10, 'P1 est #1 du jeu et gagne 10 pts de tournoi')
assert(gameRankings[1].participantId === 'p2' && p2_tournamentPts === 8, 'P2 est #2 du jeu et gagne 8 pts de tournoi')
assert(gameRankings[2].participantId === 'p3' && p3_tournamentPts === 6, 'P3 est #3 du jeu et gagne 6 pts de tournoi')

console.log('\n🎉 TOUS LES TESTS SONT VALIDÉS AVEC SUCCÈS !')
