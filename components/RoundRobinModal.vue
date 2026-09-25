<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { 
  Trophy, RotateCcw, Shuffle, Play, CheckCircle2, Circle, 
  Swords, X, RefreshCw, Sparkles, Check, AlertCircle, 
  Table, ListOrdered, Calendar, UserCheck, Flame, ChevronRight,
  Layers, Sliders, Dices, Award, Users, User, Shield, ArrowRightLeft,
  Crown, Star, HeartHandshake, Save, Zap
} from 'lucide-vue-next'
import type { ScoringType } from '~/shared/types'

const props = defineProps<{
  isOpen: boolean
  tournament: any
  selectedGameId?: string
  participants: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const activeGameId = ref('')
const activeTab = ref<'rounds' | 'standings' | 'matrix' | 'sheet'>('rounds')
const selectedRoundNumber = ref<number | 'all'>(1)
const isGenerating = ref(false)
const isSaving = ref(false)
const isSimulating = ref(false)
const isResetting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Team mode settings
const selectedTeamSize = ref<number>(1) // 1 = Solo, 2 = Duo, 3 = Trio, 4 = 4v4
const customTeamsList = ref<Array<{ name: string, seed: number, memberIds: string[] }>>([])

// Selected participants for generator
const selectedParticipantIds = ref<string[]>([])

// Local matches data fetched from backend
const gameMatchesData = ref<any>(null)
const leaderboardData = ref<any>(null)
const isLoadingMatches = ref(false)

// Tournament games
const tournamentGames = computed(() => {
  if (!props.tournament) return []
  if (props.tournament.tournamentGames && props.tournament.tournamentGames.length > 0) {
    return props.tournament.tournamentGames
  }
  return (props.tournament.games || []).map((g: any, idx: number) => ({
    id: `synth-${g.id}`,
    tournamentId: props.tournament.id,
    gameId: g.id,
    scoringType: 'ROUND_ROBIN' as ScoringType,
    teamSize: 1,
    order: idx + 1,
    game: g,
    rounds: [],
    matches: [],
    teams: []
  }))
})

const activeTournamentGame = computed(() => {
  return tournamentGames.value.find((tg: any) => tg.gameId === activeGameId.value || tg.game?.id === activeGameId.value)
})

const currentGameData = computed(() => {
  if (!gameMatchesData.value?.games) return null
  return gameMatchesData.value.games.find((g: any) => g.gameId === activeGameId.value) || gameMatchesData.value.games[0]
})

const isTeamMode = computed(() => {
  return (currentGameData.value?.isTeamMode || (currentGameData.value?.teamSize && currentGameData.value?.teamSize > 1) || (currentGameData.value?.teams && currentGameData.value.teams.length > 0))
})

const currentTeams = computed<any[]>(() => {
  return currentGameData.value?.teams || []
})

const matches = computed<any[]>(() => {
  return currentGameData.value?.matches || []
})

const standings = computed<any[]>(() => {
  return currentGameData.value?.standings || []
})

const roundsList = computed<any[]>(() => {
  return currentGameData.value?.rounds || []
})

const totalMatchesCount = computed(() => matches.value.length)
const completedMatchesCount = computed(() => matches.value.filter(m => m.status === 'COMPLETED').length)
const progressPercent = computed(() => {
  if (totalMatchesCount.value === 0) return 0
  return Math.round((completedMatchesCount.value / totalMatchesCount.value) * 100)
})

// Current round matches
const displayedMatches = computed(() => {
  if (selectedRoundNumber.value === 'all') {
    return matches.value
  }
  return matches.value.filter(m => m.roundNumber === selectedRoundNumber.value)
})

// Participants ordered by global tournament rank / points
const orderedParticipantsByRank = computed(() => {
  if (!props.participants) return []
  const lbMap = new Map<string, { totalPoints: number, globalRank: number }>()
  if (leaderboardData.value?.leaderboard) {
    for (const entry of leaderboardData.value.leaderboard) {
      lbMap.set(entry.participantId, {
        totalPoints: entry.totalPoints,
        globalRank: entry.globalRank
      })
    }
  }

  return [...props.participants]
    .filter(p => selectedParticipantIds.value.includes(p.id))
    .sort((a, b) => {
      const rankA = lbMap.get(a.id)?.globalRank ?? 999
      const rankB = lbMap.get(b.id)?.globalRank ?? 999
      if (rankA !== rankB) return rankA - rankB
      const ptsA = lbMap.get(a.id)?.totalPoints ?? 0
      const ptsB = lbMap.get(b.id)?.totalPoints ?? 0
      return ptsB - ptsA
    })
})

function getParticipantRankInfo(pId: string) {
  if (!leaderboardData.value?.leaderboard) return { rank: '?', points: 0 }
  const found = leaderboardData.value.leaderboard.find((e: any) => e.participantId === pId)
  return {
    rank: found ? found.globalRank : '?',
    points: found ? found.totalPoints : 0
  }
}

function getParticipantById(pId: string) {
  return (props.participants || []).find(p => p.id === pId)
}

// Preview calculation for generator
const generatorPreview = computed(() => {
  const count = selectedParticipantIds.value.length
  if (count < 2) return null
  const teamSize = selectedTeamSize.value
  const isTeam = teamSize > 1

  if (isTeam) {
    const numTeams = Math.ceil(count / teamSize)
    const isOddTeams = numTeams % 2 !== 0
    const effectiveTeams = isOddTeams ? numTeams + 1 : numTeams
    const totalRounds = effectiveTeams - 1
    const matchesPerRound = effectiveTeams / 2
    const totalMatches = (numTeams * (numTeams - 1)) / 2
    const simultaneousMatches = Math.floor(numTeams / 2)

    return {
      isTeam: true,
      playersCount: count,
      teamSize,
      numTeams,
      totalRounds,
      matchesPerRound,
      simultaneousMatches,
      totalMatches,
      hasBye: isOddTeams
    }
  } else {
    // Solo
    const isOdd = count % 2 !== 0
    const effectiveCount = isOdd ? count + 1 : count
    const totalRounds = effectiveCount - 1
    const matchesPerRound = effectiveCount / 2
    const totalMatches = (count * (count - 1)) / 2
    const simultaneousMatches = Math.floor(count / 2)

    return {
      isTeam: false,
      playersCount: count,
      teamSize: 1,
      totalRounds,
      matchesPerRound,
      simultaneousMatches,
      totalMatches,
      hasBye: isOdd
    }
  }
})

// Auto compute balanced teams preview
function computeBalancedTeamsDraft(teamSize = selectedTeamSize.value) {
  const ordered = orderedParticipantsByRank.value.map(p => p.id)
  if (ordered.length < 2) {
    customTeamsList.value = []
    return
  }

  const numTeams = Math.ceil(ordered.length / teamSize)
  const prefix = teamSize === 2 ? 'Duo' : 'Équipe'
  const draft: Array<{ name: string, seed: number, memberIds: string[] }> = Array.from({ length: numTeams }, (_, i) => ({
    name: `${prefix} #${i + 1}`,
    seed: i + 1,
    memberIds: []
  }))

  if (teamSize === 2) {
    // 1st with last, 2nd with 2nd-to-last
    const N = ordered.length
    for (let i = 0; i < numTeams; i++) {
      const p1 = ordered[i]
      const p2Index = N - 1 - i
      const p2 = p2Index > i ? ordered[p2Index] : null

      if (p1) draft[i].memberIds.push(p1)
      if (p2) draft[i].memberIds.push(p2)
    }
  } else {
    // Snake draft for teamSize >= 3
    let playerIdx = 0
    let round = 0
    while (playerIdx < ordered.length) {
      if (round % 2 === 0) {
        for (let t = 0; t < numTeams && playerIdx < ordered.length; t++) {
          draft[t].memberIds.push(ordered[playerIdx++])
        }
      } else {
        for (let t = numTeams - 1; t >= 0 && playerIdx < ordered.length; t--) {
          draft[t].memberIds.push(ordered[playerIdx++])
        }
      }
      round++
    }
  }

  customTeamsList.value = draft
}

function randomizeTeamsDraft() {
  const shuffled = [...selectedParticipantIds.value].sort(() => Math.random() - 0.5)
  const teamSize = selectedTeamSize.value
  const numTeams = Math.ceil(shuffled.length / teamSize)
  const prefix = teamSize === 2 ? 'Duo' : 'Équipe'
  const draft: Array<{ name: string, seed: number, memberIds: string[] }> = Array.from({ length: numTeams }, (_, i) => ({
    name: `${prefix} #${i + 1}`,
    seed: i + 1,
    memberIds: []
  }))

  let playerIdx = 0
  for (let i = 0; i < shuffled.length; i++) {
    const teamIdx = Math.floor(i / teamSize)
    if (draft[teamIdx]) {
      draft[teamIdx].memberIds.push(shuffled[i])
    }
  }

  customTeamsList.value = draft
}

// Matrix / Crosstable items (Teams or Solo players)
const matrixItems = computed(() => {
  if (isTeamMode.value) {
    if (standings.value.length > 0) return standings.value
    return currentTeams.value
  } else {
    if (standings.value.length > 0) return standings.value
    return props.participants || []
  }
})

function getItemDisplayName(item: any): string {
  if (!item) return ''
  if (isTeamMode.value) {
    return item.teamName || item.name || 'Équipe'
  }
  return item.participantName || item.nickname || item.name || 'Joueur'
}

function getItemMemberNames(item: any): string[] {
  if (!item) return []
  if (isTeamMode.value) {
    if (item.members && Array.isArray(item.members) && item.members.length > 0) {
      return item.members.map((m: any) => m.nickname || m.name || 'Joueur')
    }
    if (item.memberNames && Array.isArray(item.memberNames) && item.memberNames.length > 0) {
      return item.memberNames
    }
    // Fallback: search in currentTeams
    const id = item.teamId || item.id
    const team = currentTeams.value.find((t: any) => t.id === id)
    if (team?.members) {
      return team.members.map((m: any) => m.nickname || m.name || 'Joueur')
    }
  }
  return [item.participantName || item.nickname || item.name || 'Joueur']
}

function getItemMembersString(item: any): string {
  const names = getItemMemberNames(item)
  return names.join(', ')
}

function getItemAvatar(item: any): string | null {
  if (!item) return null
  if (item.avatar || item.avatarUrl) return item.avatar || item.avatarUrl
  if (isTeamMode.value && item.members && item.members[0]) {
    return item.members[0].avatarUrl || item.members[0].avatar || null
  }
  return null
}

function getMatrixResult(id1: string, id2: string): { type: 'self' | 'none' | 'pending' | 'win' | 'loss' | 'draw', score?: string, round?: number, match?: any } {
  if (id1 === id2) return { type: 'self', match: null }
  
  if (isTeamMode.value) {
    const match = matches.value.find(m => 
      (m.team1Id === id1 && m.team2Id === id2) || 
      (m.team1Id === id2 && m.team2Id === id1)
    )

    if (!match) return { type: 'none', match: null }
    if (match.status !== 'COMPLETED') return { type: 'pending', round: match.roundNumber, match }

    const isT1 = match.team1Id === id1
    const scoreFor = isT1 ? match.player1Score : match.player2Score
    const scoreAgainst = isT1 ? match.player2Score : match.player1Score
    const winnerTeamId = match.winnerTeamId || (match.winnerId === id1 ? id1 : (match.winnerId === id2 ? id2 : null))

    if (match.isDraw) {
      return { type: 'draw', score: `${scoreFor ?? 0}-${scoreAgainst ?? 0}`, round: match.roundNumber, match }
    }
    if (winnerTeamId === id1) {
      return { type: 'win', score: `${scoreFor ?? 1}-${scoreAgainst ?? 0}`, round: match.roundNumber, match }
    }
    return { type: 'loss', score: `${scoreFor ?? 0}-${scoreAgainst ?? 1}`, round: match.roundNumber, match }
  } else {
    const match = matches.value.find(m => 
      (m.player1Id === id1 && m.player2Id === id2) || 
      (m.player1Id === id2 && m.player2Id === id1)
    )

    if (!match) return { type: 'none', match: null }
    if (match.status !== 'COMPLETED') return { type: 'pending', round: match.roundNumber, match }

    const isP1 = match.player1Id === id1
    const scoreFor = isP1 ? match.player1Score : match.player2Score
    const scoreAgainst = isP1 ? match.player2Score : match.player1Score

    if (match.isDraw) {
      return { type: 'draw', score: `${scoreFor ?? 0}-${scoreAgainst ?? 0}`, round: match.roundNumber, match }
    }
    if (match.winnerId === id1) {
      return { type: 'win', score: `${scoreFor ?? 1}-${scoreAgainst ?? 0}`, round: match.roundNumber, match }
    }
    return { type: 'loss', score: `${scoreFor ?? 0}-${scoreAgainst ?? 1}`, round: match.roundNumber, match }
  }
}

// Quick Match Score Entry State from Matrix
const selectedQuickMatch = ref<any | null>(null)
const isQuickMatchModalOpen = ref(false)
const quickScore1 = ref<number | ''>('')
const quickScore2 = ref<number | ''>('')
const isSavingQuickMatch = ref(false)

function onMatrixCellClick(id1: string, id2: string) {
  const res = getMatrixResult(id1, id2)
  if (res.match) {
    openQuickMatchModal(res.match)
  }
}

function openQuickMatchModal(match: any) {
  selectedQuickMatch.value = match
  quickScore1.value = match.player1Score !== null && match.player1Score !== undefined ? match.player1Score : ''
  quickScore2.value = match.player2Score !== null && match.player2Score !== undefined ? match.player2Score : ''
  isQuickMatchModalOpen.value = true
}

async function saveQuickMatchWinner(winner: 'p1' | 'p2' | 'draw' | 'reset') {
  if (!selectedQuickMatch.value || !props.tournament?.id) return
  isSavingQuickMatch.value = true
  try {
    await setMatchResult(selectedQuickMatch.value, winner)
    isQuickMatchModalOpen.value = false
  } catch (err: any) {
    console.error('Erreur enregistrement match:', err)
  } finally {
    isSavingQuickMatch.value = false
  }
}

async function saveQuickMatchCustomScore() {
  if (!selectedQuickMatch.value || !props.tournament?.id) return
  const match = selectedQuickMatch.value
  match.player1Score = quickScore1.value !== '' ? Number(quickScore1.value) : 0
  match.player2Score = quickScore2.value !== '' ? Number(quickScore2.value) : 0
  
  isSavingQuickMatch.value = true
  try {
    await updateMatchScores(match)
    isQuickMatchModalOpen.value = false
  } catch (err: any) {
    console.error('Erreur enregistrement scores:', err)
  } finally {
    isSavingQuickMatch.value = false
  }
}

// Fetch matches & leaderboard for tournament
async function fetchMatches() {
  if (!props.tournament?.id) return
  isLoadingMatches.value = true
  try {
    const [matchesRes, lbRes] = await Promise.all([
      $fetch<any>(`/api/tournaments/${props.tournament.id}/matches`),
      $fetch<any>(`/api/tournaments/${props.tournament.id}/leaderboard`)
    ])
    gameMatchesData.value = matchesRes
    leaderboardData.value = lbRes
    
    // Sync current teamSize
    if (currentGameData.value?.teamSize) {
      selectedTeamSize.value = currentGameData.value.teamSize
    }
    computeBalancedTeamsDraft()
  } catch (err: any) {
    console.error('Erreur chargement matchs / leaderboard:', err)
  } finally {
    isLoadingMatches.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open && props.tournament) {
    errorMessage.value = ''
    successMessage.value = ''
    
    const defaultGameId = props.selectedGameId || 
      tournamentGames.value.find((tg: any) => tg.scoringType === 'ROUND_ROBIN')?.gameId ||
      tournamentGames.value[0]?.gameId || 
      tournamentGames.value[0]?.game?.id || ''
    
    activeGameId.value = defaultGameId
    selectedParticipantIds.value = (props.participants || []).map(p => p.id)
    fetchMatches()
  }
})

watch(() => activeGameId.value, () => {
  selectedRoundNumber.value = 1
  fetchMatches()
})

watch(() => selectedTeamSize.value, (newSize) => {
  if (newSize > 1) {
    computeBalancedTeamsDraft(newSize)
  }
})

function toggleParticipantSelection(id: string) {
  const idx = selectedParticipantIds.value.indexOf(id)
  if (idx >= 0) {
    selectedParticipantIds.value.splice(idx, 1)
  } else {
    selectedParticipantIds.value.push(id)
  }
  computeBalancedTeamsDraft()
}

function selectAllParticipants() {
  selectedParticipantIds.value = (props.participants || []).map(p => p.id)
  computeBalancedTeamsDraft()
}

function deselectAllParticipants() {
  selectedParticipantIds.value = []
  customTeamsList.value = []
}

// Generate Schedule
async function generateSchedule(shuffle = false) {
  if (!activeGameId.value || !props.tournament?.id) return
  if (selectedParticipantIds.value.length < 2) {
    errorMessage.value = 'Sélectionnez au moins 2 participants pour générer le tournoi.'
    return
  }

  isGenerating.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const res = await $fetch<any>(`/api/tournaments/${props.tournament.id}/matches/generate`, {
      method: 'POST',
      body: {
        gameId: activeGameId.value,
        teamSize: selectedTeamSize.value,
        participantIds: selectedParticipantIds.value,
        customTeams: selectedTeamSize.value > 1 ? customTeamsList.value : undefined,
        autoBalanceTeams: selectedTeamSize.value > 1 && !shuffle,
        shuffle
      }
    })

    successMessage.value = res.message || 'Tableau Round-Robin généré !'
    await fetchMatches()
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la génération du tableau.'
  } finally {
    isGenerating.value = false
  }
}

// Quick set winner for match
async function setMatchResult(match: any, winner: 'p1' | 'p2' | 'draw' | 'reset') {
  if (!props.tournament?.id) return
  
  const isTeam = !!(match.team1Id || match.team2Id)
  let player1Score = match.player1Score
  let player2Score = match.player2Score
  let winnerId = null
  let winnerTeamId = null
  let isDraw = false
  let status = 'COMPLETED'

  if (winner === 'p1') {
    if (isTeam) {
      winnerTeamId = match.team1Id
      winnerId = match.team1Id
    } else {
      winnerId = match.player1Id
    }
    player1Score = player1Score !== null && player1Score !== undefined ? player1Score : 1
    player2Score = player2Score !== null && player2Score !== undefined ? player2Score : 0
  } else if (winner === 'p2') {
    if (isTeam) {
      winnerTeamId = match.team2Id
      winnerId = match.team2Id
    } else {
      winnerId = match.player2Id
    }
    player1Score = player1Score !== null && player1Score !== undefined ? player1Score : 0
    player2Score = player2Score !== null && player2Score !== undefined ? player2Score : 1
  } else if (winner === 'draw') {
    winnerId = null
    winnerTeamId = null
    isDraw = true
    player1Score = player1Score !== null && player1Score !== undefined ? player1Score : 1
    player2Score = player2Score !== null && player2Score !== undefined ? player2Score : 1
  } else if (winner === 'reset') {
    winnerId = null
    winnerTeamId = null
    isDraw = false
    player1Score = null
    player2Score = null
    status = 'PENDING'
  }

  // Optimistic update
  match.winnerId = winnerId
  match.winnerTeamId = winnerTeamId
  match.isDraw = isDraw
  match.player1Score = player1Score
  match.player2Score = player2Score
  match.status = status

  try {
    await $fetch(`/api/tournaments/${props.tournament.id}/matches/${match.id}`, {
      method: 'PUT',
      body: {
        player1Score,
        player2Score,
        winnerId,
        winnerTeamId,
        isDraw,
        status
      }
    })
    await fetchMatches()
    emit('saved')
  } catch (err: any) {
    console.error('Erreur mise à jour match:', err)
  }
}

// Action: Score input blur / change
async function updateMatchScores(match: any) {
  if (!props.tournament?.id) return
  if (match.player1Score === '' || match.player1Score === null || match.player2Score === '' || match.player2Score === null) return

  const s1 = Number(match.player1Score)
  const s2 = Number(match.player2Score)
  const isTeam = !!(match.team1Id || match.team2Id)

  let winnerId = null
  let winnerTeamId = null
  let isDraw = false

  if (s1 > s2) {
    if (isTeam) {
      winnerTeamId = match.team1Id
      winnerId = match.team1Id
    } else {
      winnerId = match.player1Id
    }
  } else if (s2 > s1) {
    if (isTeam) {
      winnerTeamId = match.team2Id
      winnerId = match.team2Id
    } else {
      winnerId = match.player2Id
    }
  } else {
    isDraw = true
  }

  match.winnerId = winnerId
  match.winnerTeamId = winnerTeamId
  match.isDraw = isDraw
  match.status = 'COMPLETED'

  try {
    await $fetch(`/api/tournaments/${props.tournament.id}/matches/${match.id}`, {
      method: 'PUT',
      body: {
        player1Score: s1,
        player2Score: s2,
        winnerId,
        winnerTeamId,
        isDraw,
        status: 'COMPLETED'
      }
    })
    await fetchMatches()
    emit('saved')
  } catch (err: any) {
    console.error('Erreur score match:', err)
  }
}

// Simulate scores
async function simulateMatches() {
  if (!props.tournament?.id || !activeGameId.value) return
  isSimulating.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<any>(`/api/tournaments/${props.tournament.id}/matches/simulate`, {
      method: 'POST',
      body: {
        gameId: activeGameId.value,
        onlyPending: true
      }
    })
    successMessage.value = res.message || 'Matchs simulés avec succès !'
    await fetchMatches()
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la simulation.'
  } finally {
    isSimulating.value = false
  }
}

// Reset matches
async function resetMatches() {
  if (!props.tournament?.id || !activeGameId.value) return
  if (!confirm('Êtes-vous sûr de vouloir réinitialiser et supprimer toutes les rencontres de cette épreuve ?')) return

  isResetting.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/tournaments/${props.tournament.id}/matches/reset?gameId=${activeGameId.value}`, {
      method: 'DELETE'
    })
    successMessage.value = 'Tableau des matchs réinitialisé.'
    await fetchMatches()
    emit('saved')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la réinitialisation.'
  } finally {
    isResetting.value = false
  }
}
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
  >
    <div 
      class="w-full max-w-6xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150"
    >
      <!-- HEADER -->
      <div class="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Shuffle class="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg font-black text-white tracking-tight">
                Générateur & Gestionnaire Round-Robin (Solo / Duos / Équipes)
              </h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Toutes Rondes
              </span>
            </div>
            <p class="text-xs text-slate-400">
              {{ tournament?.name }} &bull; Organisation officielle et équilibrage par classement général
            </p>
          </div>
        </div>

        <button 
          @click="emit('close')" 
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- GAME SELECTOR TABS -->
      <div class="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
        <span class="text-xs font-mono font-bold text-slate-400 uppercase mr-2 shrink-0">Épreuve :</span>
        <button
          v-for="tg in tournamentGames"
          :key="tg.gameId || tg.game?.id"
          @click="activeGameId = tg.gameId || tg.game?.id"
          class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer"
          :class="activeGameId === (tg.gameId || tg.game?.id) 
            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
            : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'"
        >
          <img :src="tg.game?.coverUrl || 'https://placehold.co/20x25'" class="w-4 h-5 object-cover rounded bg-slate-900" />
          <span>{{ tg.game?.name }}</span>
          <span 
            v-if="tg.scoringType === 'ROUND_ROBIN'"
            class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase"
            :class="activeGameId === (tg.gameId || tg.game?.id) ? 'bg-slate-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'"
          >
            {{ (tg.teamSize && tg.teamSize > 1) ? `RR (${tg.teamSize}v${tg.teamSize})` : 'RR Solo' }}
          </span>
        </button>
      </div>

      <!-- MAIN CONTENT (BODY) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        
        <!-- Alerts -->
        <div v-if="errorMessage" class="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-xs font-mono flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0 text-rose-400" />
          <span>{{ errorMessage }}</span>
        </div>
        <div v-if="successMessage" class="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 text-emerald-200 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 class="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- ========================================================= -->
        <!-- STATE A: NO MATCHES YET -> GENERATOR & TEAM DRAFT CONFIG -->
        <!-- ========================================================= -->
        <div v-if="!matches || matches.length === 0" class="space-y-6">
          
          <!-- GENERATOR MODE SELECTOR (Solo vs Duo vs Squad) -->
          <div class="cyber-card p-6 border-amber-500/40 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 relative overflow-hidden">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 class="text-lg font-black text-white flex items-center gap-2">
                  <Sparkles class="w-5 h-5 text-amber-400" />
                  <span>Configuration du Tournoi Round-Robin</span>
                </h3>
                <p class="text-xs text-slate-300 mt-1 max-w-2xl">
                  Choisissez le format (Solo ou Duos / Équipes). En mode Duos, les équipes sont équilibrées automatiquement selon le classement général (1er avec dernier, 2e avec avant-dernier...).
                </p>
              </div>

              <!-- Action button -->
              <div class="flex items-center gap-2">
                <button 
                  v-if="selectedTeamSize > 1"
                  @click="randomizeTeamsDraft()"
                  class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  title="Mélanger les équipes aléatoirement"
                >
                  <Dices class="w-4 h-4 text-cyan-400" />
                  <span>Tirage Aléatoire</span>
                </button>

                <button 
                  v-if="selectedTeamSize > 1"
                  @click="computeBalancedTeamsDraft()"
                  class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  title="Rééquilibrer les équipes selon le classement général (1er avec dernier...)"
                >
                  <Flame class="w-4 h-4 text-amber-400" />
                  <span>Équilibrer (1er + Dernier)</span>
                </button>

                <button 
                  @click="generateSchedule(false)"
                  :disabled="isGenerating || selectedParticipantIds.length < 2"
                  class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play class="w-4 h-4 fill-current" />
                  <span>{{ isGenerating ? 'Génération...' : 'Générer le Tableau Officiel' }}</span>
                </button>
              </div>
            </div>

            <!-- FORMAT TOGGLE BUTTONS -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              
              <!-- SOLO 1v1 -->
              <button 
                type="button"
                @click="selectedTeamSize = 1"
                class="p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer"
                :class="selectedTeamSize === 1 
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
              >
                <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0" :class="selectedTeamSize === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'">
                  <User class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-bold text-white">Solo (1v1)</div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">Chaque participant joue individuellement contre tous les autres.</div>
                </div>
              </button>

              <!-- DUO 2v2 (RECOMMENDED) -->
              <button 
                type="button"
                @click="selectedTeamSize = 2"
                class="p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer relative overflow-hidden"
                :class="selectedTeamSize === 2 
                  ? 'bg-gradient-to-r from-amber-500/20 via-cyan-950/40 to-slate-900 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
              >
                <div class="absolute top-2 right-2 px-1.5 py-0.2 rounded bg-cyan-500 text-slate-950 font-mono font-black text-[9px] uppercase">
                  Format LAN Équilibré
                </div>
                <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0" :class="selectedTeamSize === 2 ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'">
                  <HeartHandshake class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Duos (2v2)</span>
                  </div>
                  <div class="text-[11px] text-slate-300 font-mono mt-0.5">
                    <strong>1er avec dernier</strong>, 2e avec avant-dernier, etc. selon le classement global !
                  </div>
                </div>
              </button>

              <!-- SQUAD / TRIO -->
              <button 
                type="button"
                @click="selectedTeamSize = 3"
                class="p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer"
                :class="selectedTeamSize >= 3 
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
              >
                <div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0" :class="selectedTeamSize >= 3 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'">
                  <Shield class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-bold text-white">Trios & Escouades (3v3+)</div>
                  <div class="text-[11px] text-slate-400 font-mono mt-0.5">Draft snake automatique pour équilibrer la force de chaque équipe.</div>
                </div>
              </button>

            </div>

            <!-- PREVIEW SUMMARY CARD -->
            <div v-if="generatorPreview" class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/80 border border-amber-500/20 font-mono text-center">
              <div class="p-2">
                <div class="text-[10px] text-slate-400 uppercase font-bold">
                  {{ generatorPreview.isTeam ? 'Équipes Formées' : 'Participants' }}
                </div>
                <div class="text-xl font-black text-white mt-0.5">
                  {{ generatorPreview.isTeam ? `${generatorPreview.numTeams} ${generatorPreview.teamSize === 2 ? 'Duos' : 'Équipes'}` : `${generatorPreview.playersCount} joueurs` }}
                </div>
              </div>
              <div class="p-2 border-l border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Nombre de Tours</div>
                <div class="text-xl font-black text-amber-400 mt-0.5">{{ generatorPreview.totalRounds }} tours</div>
              </div>
              <div class="p-2 border-l border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Matchs Simultanés / Tour</div>
                <div class="text-xl font-black text-cyan-400 mt-0.5">{{ generatorPreview.simultaneousMatches }} matchs</div>
              </div>
              <div class="p-2 border-l border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold">Total des Matchs</div>
                <div class="text-xl font-black text-emerald-400 mt-0.5">{{ generatorPreview.totalMatches }} matchs</div>
              </div>
            </div>

            <!-- Duo 10 players spotlight callout -->
            <div v-if="generatorPreview?.playersCount === 10 && selectedTeamSize === 2" class="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Format Spécifique Détecté :</strong> 10 participants &rarr; <strong>5 Duos Équilibrés</strong> (1er+10e, 2e+9e, 3e+8e, 4e+7e, 5e+6e) &bull; <strong>5 tours de 2 matchs simultanés</strong> &bull; 10 confrontations au total.
              </span>
            </div>
          </div>

          <!-- TEAM DRAFT PREVIEW (WHEN TEAM SIZE >= 2) -->
          <div v-if="selectedTeamSize > 1 && customTeamsList.length > 0" class="cyber-card p-5 border-slate-800 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Users class="w-4 h-4 text-cyan-400" />
                <h4 class="text-sm font-bold text-white uppercase font-mono">
                  Composition des {{ selectedTeamSize === 2 ? 'Duos' : 'Équipes' }} (Équilibrage Automatique par Score Global)
                </h4>
              </div>
              <div class="text-xs font-mono text-slate-400">
                Basé sur le classement général du tournoi
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div 
                v-for="(team, tIdx) in customTeamsList" 
                :key="tIdx"
                class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3"
              >
                <!-- Team title -->
                <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-mono font-bold text-xs">
                      #{{ tIdx + 1 }}
                    </span>
                    <input 
                      v-model="team.name" 
                      class="bg-transparent font-mono font-bold text-xs text-white border-b border-transparent focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">
                    {{ team.memberIds.length }} joueur{{ team.memberIds.length > 1 ? 's' : '' }}
                  </span>
                </div>

                <!-- Team members list -->
                <div class="space-y-2">
                  <div 
                    v-for="mId in team.memberIds" 
                    :key="mId"
                    class="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <img 
                        :src="getParticipantById(mId)?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${getParticipantById(mId)?.nickname || mId}`" 
                        class="w-6 h-6 rounded bg-slate-950 object-cover shrink-0" 
                      />
                      <span class="font-bold text-white truncate">
                        {{ getParticipantById(mId)?.nickname || 'Joueur' }}
                      </span>
                    </div>

                    <!-- Global tournament rank & score badge -->
                    <div class="flex items-center gap-1 shrink-0">
                      <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-700 text-amber-300 font-bold">
                        #{{ getParticipantRankInfo(mId).rank }}
                      </span>
                      <span class="text-[10px] text-slate-400">
                        {{ getParticipantRankInfo(mId).points }} pts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- PARTICIPANT SELECTION -->
          <div class="cyber-card p-5 border-slate-800">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UserCheck class="w-4 h-4 text-amber-400" />
                <h4 class="text-sm font-bold text-white uppercase font-mono">
                  Sélection des Participants au Tournoi ({{ selectedParticipantIds.length }}/{{ participants.length }})
                </h4>
              </div>
              <div class="flex items-center gap-2 text-xs font-mono">
                <button @click="selectAllParticipants" class="text-amber-400 hover:underline cursor-pointer">Tout cocher</button>
                <span class="text-slate-600">&bull;</span>
                <button @click="deselectAllParticipants" class="text-slate-400 hover:underline cursor-pointer">Tout décocher</button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div 
                v-for="p in participants" 
                :key="p.id"
                @click="toggleParticipantSelection(p.id)"
                class="p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all select-none"
                :class="selectedParticipantIds.includes(p.id) 
                  ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'"
              >
                <div 
                  class="w-5 h-5 rounded flex items-center justify-center border text-xs font-bold shrink-0 transition-colors"
                  :class="selectedParticipantIds.includes(p.id) ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700 bg-slate-900'"
                >
                  <Check v-if="selectedParticipantIds.includes(p.id)" class="w-3.5 h-3.5 stroke-[3]" />
                </div>

                <img :src="p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.nickname}`" class="w-8 h-8 rounded-lg bg-slate-900 object-cover border border-slate-700 shrink-0" />

                <div class="min-w-0 flex-1">
                  <div class="text-xs font-bold truncate" :class="selectedParticipantIds.includes(p.id) ? 'text-amber-300' : 'text-slate-300'">
                    {{ p.nickname }}
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono truncate">
                    Rang global: #{{ getParticipantRankInfo(p.id).rank }} ({{ getParticipantRankInfo(p.id).points }} pts)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ========================================================= -->
        <!-- STATE B: MATCHES GENERATED -> DASHBOARD & LIVE RESULTS    -->
        <!-- ========================================================= -->
        <div v-else class="space-y-6">
          
          <!-- Top Bar with Stats & Quick Actions -->
          <div class="cyber-card p-4 border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-950/60">
            <!-- Left: Progress -->
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-3">
                <div class="text-2xl font-black font-mono text-amber-400">
                  {{ completedMatchesCount }} / {{ totalMatchesCount }}
                </div>
                <div>
                  <div class="text-xs font-bold text-white flex items-center gap-2">
                    <span>Matchs Joués</span>
                    <span class="text-xs text-amber-400 font-mono font-black">({{ progressPercent }}%)</span>
                  </div>
                  <div class="w-36 h-2 bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300" :style="{ width: `${progressPercent}%` }" />
                  </div>
                </div>
              </div>

              <div class="hidden sm:block h-8 w-px bg-slate-800" />

              <div class="hidden sm:flex items-center gap-3 text-xs font-mono text-slate-400">
                <div v-if="isTeamMode">
                  <span class="text-cyan-300 font-bold">{{ standings.length }}</span> équipes
                </div>
                <div v-else>
                  <span class="text-white font-bold">{{ standings.length }}</span> joueurs
                </div>
                <div>&bull;</div>
                <div>
                  <span class="text-white font-bold">{{ roundsList.length }}</span> tours
                </div>
              </div>
            </div>

            <!-- Center: View Mode Nav Buttons -->
            <div class="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button 
                @click="activeTab = 'rounds'"
                class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                :class="activeTab === 'rounds' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
              >
                <Calendar class="w-3.5 h-3.5" />
                <span>Par Tour</span>
              </button>
              <button 
                @click="activeTab = 'standings'"
                class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                :class="activeTab === 'standings' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
              >
                <Trophy class="w-3.5 h-3.5" />
                <span>Classement</span>
              </button>
              <button 
                @click="activeTab = 'matrix'"
                class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                :class="activeTab === 'matrix' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
              >
                <Table class="w-3.5 h-3.5" />
                <span>Matrice Croisée</span>
              </button>
              <button 
                @click="activeTab = 'sheet'"
                class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                :class="activeTab === 'sheet' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'"
              >
                <Layers class="w-3.5 h-3.5" />
                <span>Tableau Complet</span>
              </button>
            </div>

            <!-- Right: Admin Utility Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <button 
                @click="simulateMatches"
                :disabled="isSimulating"
                class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Simuler les scores des matchs restants"
              >
                <Sparkles class="w-3.5 h-3.5" :class="{ 'animate-spin': isSimulating }" />
                <span>Simuler</span>
              </button>

              <button 
                @click="resetMatches"
                :disabled="isResetting"
                class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:border-rose-500/50 hover:bg-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Supprimer les matchs et régénérer"
              >
                <RotateCcw class="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <!-- TAB 1: PAR TOUR (ROUNDS VIEW) -->
          <div v-if="activeTab === 'rounds'" class="space-y-4">
            <!-- Round Navigation Pills -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1">
              <button 
                v-for="r in roundsList" 
                :key="r.roundNumber"
                @click="selectedRoundNumber = r.roundNumber"
                class="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer border"
                :class="selectedRoundNumber === r.roundNumber 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'"
              >
                <span>Tour {{ r.roundNumber }}</span>
                <span 
                  class="text-[10px] px-1.5 py-0.2 rounded-full font-bold"
                  :class="selectedRoundNumber === r.roundNumber 
                    ? 'bg-slate-950 text-amber-300' 
                    : (r.completedCount === r.totalCount ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400')"
                >
                  {{ r.completedCount }}/{{ r.totalCount }}
                </span>
              </button>

              <button 
                @click="selectedRoundNumber = 'all'"
                class="px-3.5 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border"
                :class="selectedRoundNumber === 'all' 
                  ? 'bg-amber-500 text-slate-950 border-amber-400' 
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'"
              >
                <span>Tous les tours</span>
              </button>
            </div>

            <!-- Matches List in Active Round -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div 
                v-for="match in displayedMatches" 
                :key="match.id"
                class="p-4 rounded-2xl bg-slate-950/80 border transition-all relative overflow-hidden"
                :class="{
                  'border-emerald-500/40 bg-gradient-to-r from-slate-950 via-emerald-950/10 to-slate-950': match.status === 'COMPLETED',
                  'border-slate-800 hover:border-amber-500/40': match.status !== 'COMPLETED'
                }"
              >
                <!-- Match Header (Number & Status) -->
                <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-3">
                  <span class="font-bold uppercase tracking-wider text-slate-300">
                    Tour {{ match.roundNumber }} &bull; Match #{{ match.matchNumber }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span 
                      class="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      :class="{
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40': match.status === 'COMPLETED',
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40': match.status === 'IN_PROGRESS',
                        'bg-slate-800 text-slate-400': match.status === 'PENDING'
                      }"
                    >
                      {{ match.status === 'COMPLETED' ? (match.isDraw ? 'Match Nul' : 'Terminé') : 'À Jouer' }}
                    </span>
                    <button 
                      v-if="match.status === 'COMPLETED'"
                      @click="setMatchResult(match, 'reset')"
                      class="text-slate-500 hover:text-rose-400 text-[10px] cursor-pointer"
                      title="Annuler le résultat"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <!-- Match Face-off (Side 1 VS Side 2) -->
                <div class="flex items-center justify-between gap-3">
                  
                  <!-- SIDE 1 (Player 1 or Team 1) -->
                  <div 
                    class="flex-1 p-2.5 rounded-xl border transition-all flex flex-col justify-center"
                    :class="{
                      'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]': (match.winnerId === match.player1Id || match.winnerTeamId === match.team1Id || match.winnerId === match.team1Id),
                      'bg-slate-900/90 border-slate-800': !(match.winnerId === match.player1Id || match.winnerTeamId === match.team1Id || match.winnerId === match.team1Id)
                    }"
                  >
                    <!-- If TEAM MODE -->
                    <template v-if="match.team1">
                      <div class="text-xs font-black truncate" :class="(match.winnerTeamId === match.team1Id || match.winnerId === match.team1Id) ? 'text-emerald-300' : 'text-cyan-300'">
                        {{ match.team1.name }}
                      </div>
                      <div class="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <div 
                          v-for="m in match.team1.members" 
                          :key="m.id"
                          class="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300"
                        >
                          <img :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" class="w-3.5 h-3.5 rounded object-cover" />
                          <span class="font-bold truncate max-w-[70px]">{{ m.nickname }}</span>
                        </div>
                      </div>
                    </template>

                    <!-- If SOLO MODE -->
                    <template v-else>
                      <div class="flex items-center gap-2.5">
                        <img 
                          :src="match.player1?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player1?.nickname || 'P1'}`" 
                          class="w-9 h-9 rounded-lg bg-slate-950 object-cover border border-slate-700 shrink-0" 
                        />
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-bold truncate" :class="match.winnerId === match.player1Id ? 'text-emerald-300 font-black' : 'text-white'">
                            {{ match.player1?.nickname || 'Joueur 1' }}
                          </div>
                          <div class="text-[10px] text-slate-400 font-mono truncate">
                            {{ match.player1?.rig?.gpuName || 'Place LAN' }}
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>

                  <!-- Scores & VS Selector -->
                  <div class="flex flex-col items-center justify-center shrink-0 px-1">
                    <div class="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        min="0"
                        v-model="match.player1Score"
                        @blur="updateMatchScores(match)"
                        placeholder="0"
                        class="w-10 h-9 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-black text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                      <span class="text-xs font-black text-slate-500">:</span>
                      <input 
                        type="number" 
                        min="0"
                        v-model="match.player2Score"
                        @blur="updateMatchScores(match)"
                        placeholder="0"
                        class="w-10 h-9 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-black text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <!-- Quick Winner Buttons -->
                    <div class="flex items-center gap-1 mt-2">
                      <button 
                        @click="setMatchResult(match, 'p1')"
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        :class="(match.winnerId === match.player1Id || match.winnerTeamId === match.team1Id || match.winnerId === match.team1Id) ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'"
                      >
                        {{ match.team1 ? 'Victoire E1' : 'Victoire J1' }}
                      </button>
                      <button 
                        @click="setMatchResult(match, 'draw')"
                        class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        :class="match.isDraw ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'"
                      >
                        Nul
                      </button>
                      <button 
                        @click="setMatchResult(match, 'p2')"
                        class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
                        :class="(match.winnerId === match.player2Id || match.winnerTeamId === match.team2Id || match.winnerId === match.team2Id) ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400 hover:text-white'"
                      >
                        {{ match.team2 ? 'Victoire E2' : 'Victoire J2' }}
                      </button>
                    </div>
                  </div>

                  <!-- SIDE 2 (Player 2 or Team 2) -->
                  <div 
                    class="flex-1 p-2.5 rounded-xl border transition-all flex flex-col justify-center text-right"
                    :class="{
                      'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]': (match.winnerId === match.player2Id || match.winnerTeamId === match.team2Id || match.winnerId === match.team2Id),
                      'bg-slate-900/90 border-slate-800': !(match.winnerId === match.player2Id || match.winnerTeamId === match.team2Id || match.winnerId === match.team2Id)
                    }"
                  >
                    <!-- If TEAM MODE -->
                    <template v-if="match.team2">
                      <div class="text-xs font-black truncate" :class="(match.winnerTeamId === match.team2Id || match.winnerId === match.team2Id) ? 'text-emerald-300' : 'text-cyan-300'">
                        {{ match.team2.name }}
                      </div>
                      <div class="flex flex-wrap items-center justify-end gap-1.5 mt-1.5">
                        <div 
                          v-for="m in match.team2.members" 
                          :key="m.id"
                          class="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[10px] text-slate-300"
                        >
                          <span class="font-bold truncate max-w-[70px]">{{ m.nickname }}</span>
                          <img :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" class="w-3.5 h-3.5 rounded object-cover" />
                        </div>
                      </div>
                    </template>

                    <!-- If SOLO MODE -->
                    <template v-else>
                      <div class="flex items-center justify-end gap-2.5">
                        <div class="min-w-0 flex-1">
                          <div class="text-xs font-bold truncate" :class="match.winnerId === match.player2Id ? 'text-emerald-300 font-black' : 'text-white'">
                            {{ match.player2?.nickname || 'Joueur 2' }}
                          </div>
                          <div class="text-[10px] text-slate-400 font-mono truncate">
                            {{ match.player2?.rig?.gpuName || 'Place LAN' }}
                          </div>
                        </div>
                        <img 
                          :src="match.player2?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.player2?.nickname || 'P2'}`" 
                          class="w-9 h-9 rounded-lg bg-slate-950 object-cover border border-slate-700 shrink-0" 
                        />
                      </div>
                    </template>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: CLASSEMENT ROUND-ROBIN (STANDINGS) -->
          <div v-if="activeTab === 'standings'" class="cyber-card p-5 border-slate-800">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <Trophy class="w-4 h-4 text-amber-400" />
                <h4 class="text-sm font-bold text-white uppercase font-mono">
                  Classement {{ isTeamMode ? 'par Équipe' : 'Général' }} Round-Robin & Barème Tournoi
                </h4>
              </div>
              <div class="text-xs font-mono text-slate-400">
                Victoire : 3 pts &bull; Nul : 1 pt &bull; Défaite : 0 pt
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left font-mono text-xs">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th class="py-2.5 px-3">Rang</th>
                    <th class="py-2.5 px-3">{{ isTeamMode ? 'Équipe / Coéquipiers' : 'Participant' }}</th>
                    <th class="py-2.5 px-3 text-center">J</th>
                    <th class="py-2.5 px-3 text-center text-emerald-400">V</th>
                    <th class="py-2.5 px-3 text-center text-amber-400">N</th>
                    <th class="py-2.5 px-3 text-center text-rose-400">D</th>
                    <th class="py-2.5 px-3 text-center">Pour</th>
                    <th class="py-2.5 px-3 text-center">Contre</th>
                    <th class="py-2.5 px-3 text-center">Diff</th>
                    <th class="py-2.5 px-3 text-center text-amber-300 font-black">Pts RR</th>
                    <th class="py-2.5 px-3 text-right text-cyan-300 font-black">Pts Tournoi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  <tr 
                    v-for="st in standings" 
                    :key="st.teamId || st.participantId"
                    class="hover:bg-slate-800/40 transition-colors"
                    :class="{
                      'bg-amber-500/10 font-bold': st.rank === 1,
                      'bg-slate-800/20': st.rank === 2 || st.rank === 3
                    }"
                  >
                    <td class="py-3 px-3">
                      <span 
                        class="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs"
                        :class="{
                          'bg-amber-400 text-slate-950 shadow-glow-amber': st.rank === 1,
                          'bg-slate-400 text-slate-950': st.rank === 2,
                          'bg-orange-700 text-white': st.rank === 3,
                          'bg-slate-800 text-slate-400': st.rank > 3
                        }"
                      >
                        {{ st.rank }}
                      </span>
                    </td>
                    
                    <!-- Team vs Solo column -->
                    <td class="py-3 px-3">
                      <template v-if="st.teamName">
                        <div class="space-y-1">
                          <div class="font-bold text-white flex items-center gap-2">
                            <span class="text-cyan-400 font-black">{{ st.teamName }}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <div 
                              v-for="m in st.teamMembers" 
                              :key="m.id"
                              class="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px] text-slate-300"
                            >
                              <img :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" class="w-4 h-4 rounded object-cover" />
                              <span>{{ m.nickname }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template v-else>
                        <div class="flex items-center gap-2.5">
                          <img :src="st.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.participantName}`" class="w-6 h-6 rounded bg-slate-900 object-cover" />
                          <span class="font-bold text-white">{{ st.participantName }}</span>
                        </div>
                      </template>
                    </td>

                    <td class="py-3 px-3 text-center text-slate-300">{{ st.played }}</td>
                    <td class="py-3 px-3 text-center font-bold text-emerald-400">{{ st.wins }}</td>
                    <td class="py-3 px-3 text-center text-amber-400">{{ st.draws }}</td>
                    <td class="py-3 px-3 text-center text-rose-400">{{ st.losses }}</td>
                    <td class="py-3 px-3 text-center text-slate-400">{{ st.scoreFor }}</td>
                    <td class="py-3 px-3 text-center text-slate-400">{{ st.scoreAgainst }}</td>
                    <td class="py-3 px-3 text-center font-bold" :class="st.scoreDiff > 0 ? 'text-emerald-400' : (st.scoreDiff < 0 ? 'text-rose-400' : 'text-slate-400')">
                      {{ st.scoreDiff > 0 ? `+${st.scoreDiff}` : st.scoreDiff }}
                    </td>
                    <td class="py-3 px-3 text-center font-black text-amber-400 text-sm">
                      {{ st.rrPoints }}
                    </td>
                    <td class="py-3 px-3 text-right font-black text-cyan-300 text-sm">
                      +{{ st.tournamentPoints }} pts
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: MATRICE CROISÉE (CROSSTABLE GRID) -->
          <div v-if="activeTab === 'matrix'" class="cyber-card p-5 border-slate-800 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <Table class="w-4 h-4 text-amber-400" />
                <h4 class="text-sm font-bold text-white uppercase font-mono">
                  Matrice des Confrontations Croisées ({{ isTeamMode ? 'Équipe vs Équipe' : 'Joueur vs Joueur' }})
                </h4>
              </div>
              <div class="text-xs font-mono text-slate-400 flex flex-wrap items-center gap-3">
                <span class="text-emerald-400 font-bold flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> V : Victoire
                </span>
                <span class="text-amber-400 font-bold flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> N : Nul
                </span>
                <span class="text-rose-400 font-bold flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-rose-400 inline-block"></span> D : Défaite
                </span>
                <span class="text-cyan-300 font-bold flex items-center gap-1">
                  <Zap class="w-3 h-3 text-cyan-400" /> Cliquer sur un match pour saisir le score
                </span>
              </div>
            </div>

            <div class="overflow-x-auto pb-2 scrollbar-thin">
              <table class="w-full text-center font-mono text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr class="border-b border-slate-800 bg-slate-950/60">
                    <th class="p-3 text-left text-slate-400 text-[10px] uppercase min-w-[180px] sticky left-0 bg-slate-950/95 z-10">
                      {{ isTeamMode ? 'Équipes \\ Adversaires' : 'Joueurs \\ Adversaires' }}
                    </th>
                    <th 
                      v-for="(item, idx) in matrixItems" 
                      :key="item.teamId || item.participantId || item.id"
                      class="p-2.5 text-slate-300 text-[10px] uppercase font-bold min-w-[70px] max-w-[110px]"
                      :title="`${getItemDisplayName(item)} : ${getItemMembersString(item)}`"
                    >
                      <div class="flex flex-col items-center gap-1">
                        <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-amber-400 font-mono font-black text-[10px]">
                          #{{ idx + 1 }}
                        </span>

                        <!-- Solo Player Header -->
                        <template v-if="!isTeamMode">
                          <img 
                            :src="getItemAvatar(item) || `https://api.dicebear.com/7.x/bottts/svg?seed=${getItemDisplayName(item)}`" 
                            class="w-5 h-5 rounded-full bg-slate-900 border border-slate-800 object-cover" 
                          />
                          <span class="text-[11px] font-bold text-white truncate max-w-[75px] block">
                            {{ getItemDisplayName(item) }}
                          </span>
                        </template>

                        <!-- Team Header -->
                        <template v-else>
                          <span class="text-[10px] font-bold text-cyan-300 truncate max-w-[85px] block">
                            {{ getItemDisplayName(item) }}
                          </span>
                          <span class="text-[9px] text-slate-400 font-normal truncate max-w-[85px] block" :title="getItemMembersString(item)">
                            {{ getItemMembersString(item) }}
                          </span>
                        </template>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  <tr 
                    v-for="(item1, idx1) in matrixItems" 
                    :key="item1.teamId || item1.participantId || item1.id" 
                    class="hover:bg-slate-800/30 transition-colors"
                  >
                    <!-- Row Header Left -->
                    <td class="p-2.5 text-left sticky left-0 bg-slate-950/95 z-10 border-r border-slate-850">
                      <div class="flex items-center gap-2.5">
                        <span class="text-[10px] font-black font-mono text-amber-400 shrink-0">
                          #{{ idx1 + 1 }}
                        </span>

                        <!-- Solo Row Info -->
                        <template v-if="!isTeamMode">
                          <img 
                            :src="getItemAvatar(item1) || `https://api.dicebear.com/7.x/bottts/svg?seed=${getItemDisplayName(item1)}`" 
                            class="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 shrink-0 object-cover" 
                          />
                          <span class="font-bold text-white text-xs truncate max-w-[130px]">
                            {{ getItemDisplayName(item1) }}
                          </span>
                        </template>

                        <!-- Team Row Info -->
                        <template v-else>
                          <div class="min-w-0">
                            <div class="font-bold text-cyan-300 text-xs truncate">
                              {{ getItemDisplayName(item1) }}
                            </div>
                            <div class="text-[10px] text-slate-400 font-normal truncate max-w-[140px]" :title="getItemMembersString(item1)">
                              {{ getItemMembersString(item1) }}
                            </div>
                          </div>
                        </template>
                      </div>
                    </td>

                    <!-- Cells (Match Results) -->
                    <td 
                      v-for="(item2, idx2) in matrixItems" 
                      :key="item2.teamId || item2.participantId || item2.id"
                      class="p-1.5"
                    >
                      <!-- Diagonal Self -->
                      <div 
                        v-if="idx1 === idx2" 
                        class="w-full h-9 bg-slate-900/90 rounded-lg border border-slate-800/60 flex items-center justify-center text-slate-700 font-black text-sm"
                      >
                        &times;
                      </div>

                      <!-- Match Cell -->
                      <button
                        v-else 
                        type="button"
                        @click="onMatrixCellClick(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id)"
                        class="w-full h-9 rounded-lg flex items-center justify-center font-bold text-xs border transition-all cursor-pointer group hover:scale-105 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)] relative"
                        :class="{
                          'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:border-emerald-400': getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'win',
                          'bg-rose-950/60 border-rose-500/50 text-rose-300 hover:border-rose-400': getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'loss',
                          'bg-amber-950/60 border-amber-500/50 text-amber-300 hover:border-amber-400': getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'draw',
                          'bg-slate-950 border-slate-800 text-slate-500 hover:border-cyan-500/60 hover:text-cyan-300 hover:bg-cyan-950/20': getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'pending' || getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'none'
                        }"
                        :title="`Match Tour ${getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).round || '?'} : Cliquer pour saisir ou modifier le score`"
                      >
                        <!-- Win -->
                        <span v-if="getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'win'">
                          V <span class="text-[10px] font-normal opacity-85 ml-0.5">{{ getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).score }}</span>
                        </span>

                        <!-- Loss -->
                        <span v-else-if="getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'loss'">
                          D <span class="text-[10px] font-normal opacity-85 ml-0.5">{{ getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).score }}</span>
                        </span>

                        <!-- Draw -->
                        <span v-else-if="getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).type === 'draw'">
                          N <span class="text-[10px] font-normal opacity-85 ml-0.5">{{ getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).score }}</span>
                        </span>

                        <!-- Pending / Non-played -->
                        <span v-else class="text-[11px] group-hover:text-cyan-400 flex items-center gap-0.5 opacity-60 group-hover:opacity-100">
                          <span>T{{ getMatrixResult(item1.teamId || item1.participantId || item1.id, item2.teamId || item2.participantId || item2.id).round || '?' }}</span>
                          <Zap class="w-2.5 h-2.5 hidden group-hover:inline-block" />
                        </span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 4: FEUILLE OFFICIELLE DES RENCONTRES (SHEET) -->
          <div v-if="activeTab === 'sheet'" class="space-y-4">
            <div 
              v-for="r in roundsList" 
              :key="r.roundNumber"
              class="cyber-card p-4 border-slate-800 bg-slate-950/70"
            >
              <div class="flex items-center justify-between mb-3 text-xs font-mono">
                <span class="font-bold text-amber-400 uppercase">
                  Tour {{ r.roundNumber }} ({{ r.matches.length }} matchs simultanés)
                </span>
                <span class="text-slate-400 font-bold">
                  {{ r.completedCount }} / {{ r.totalCount }} terminés
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono">
                <div 
                  v-for="m in r.matches" 
                  :key="m.id"
                  class="p-2.5 rounded-lg bg-slate-900 border flex items-center justify-between gap-2"
                  :class="m.status === 'COMPLETED' ? 'border-emerald-500/30' : 'border-slate-800'"
                >
                  <span class="truncate font-bold" :class="(m.winnerId === m.player1Id || m.winnerTeamId === m.team1Id) ? 'text-emerald-300' : 'text-slate-300'">
                    {{ m.team1 ? m.team1.name : m.player1?.nickname }}
                  </span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-black shrink-0" :class="m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'">
                    {{ m.status === 'COMPLETED' ? `${m.player1Score ?? 0}-${m.player2Score ?? 0}` : 'vs' }}
                  </span>
                  <span class="truncate font-bold text-right" :class="(m.winnerId === m.player2Id || m.winnerTeamId === m.team2Id) ? 'text-emerald-300' : 'text-slate-300'">
                    {{ m.team2 ? m.team2.name : m.player2?.nickname }}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
        <div class="text-xs text-slate-400 font-mono">
          {{ isTeamMode ? `Système Toutes Rondes par Équipe (${currentGameData?.teamSize || 2}v${currentGameData?.teamSize || 2})` : 'Système Toutes Rondes Solo (1v1)' }} &bull; Points réinjectés au classement global
        </div>
        <button 
          @click="emit('close')" 
          class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
        >
          Fermer
        </button>
      </div>
    </div>

    <!-- QUICK MATCH SCORE MODAL (CLICKED FROM MATRIX OR MATCH CARDS) -->
    <Teleport to="body">
      <div 
        v-if="isQuickMatchModalOpen && selectedQuickMatch"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        @click.self="isQuickMatchModalOpen = false"
      >
        <div class="cyber-card p-6 border-amber-500/50 bg-slate-900 max-w-lg w-full space-y-6 shadow-2xl relative">
          <!-- Header -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-800">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Swords class="w-4 h-4" />
              </div>
              <div>
                <h3 class="text-base font-bold text-white font-mono">
                  Saisie du Résultat de Match
                </h3>
                <p class="text-xs font-mono text-slate-400">
                  Tour {{ selectedQuickMatch.roundNumber }} &bull; Match #{{ selectedQuickMatch.matchNumber }}
                </p>
              </div>
            </div>

            <button 
              @click="isQuickMatchModalOpen = false"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Match Faceoff Card -->
          <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
            <div class="grid grid-cols-2 gap-4 items-center">
              
              <!-- Side 1: Player / Team 1 -->
              <div 
                class="p-3 rounded-xl border flex flex-col items-center text-center space-y-2 transition-all"
                :class="(selectedQuickMatch.winnerId === selectedQuickMatch.player1Id || selectedQuickMatch.winnerTeamId === selectedQuickMatch.team1Id)
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900 border-slate-800'"
              >
                <!-- Avatar / Member Avatars -->
                <div class="flex items-center justify-center -space-x-2">
                  <template v-if="selectedQuickMatch.team1?.members?.length > 0">
                    <img 
                      v-for="m in selectedQuickMatch.team1.members" 
                      :key="m.id"
                      :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" 
                      class="w-8 h-8 rounded-full border-2 border-slate-950 object-cover bg-slate-900" 
                    />
                  </template>
                  <template v-else>
                    <img 
                      :src="selectedQuickMatch.player1?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedQuickMatch.player1?.nickname || '1'}`" 
                      class="w-10 h-10 rounded-full border border-slate-700 object-cover bg-slate-900" 
                    />
                  </template>
                </div>

                <div>
                  <div class="font-bold text-white text-sm font-mono truncate max-w-[140px]">
                    {{ selectedQuickMatch.team1 ? selectedQuickMatch.team1.name : selectedQuickMatch.player1?.nickname }}
                  </div>
                  <div v-if="selectedQuickMatch.team1?.members" class="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    {{ selectedQuickMatch.team1.members.map((m: any) => m.nickname).join(', ') }}
                  </div>
                </div>

                <!-- Custom Score Input 1 -->
                <div class="w-full pt-1">
                  <label class="block text-[10px] font-mono text-slate-400 mb-1">Score :</label>
                  <input 
                    v-model.number="quickScore1"
                    @keyup.enter="saveQuickMatchCustomScore"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-20 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center text-sm focus:border-amber-500 mx-auto block"
                  />
                </div>
              </div>

              <!-- Side 2: Player / Team 2 -->
              <div 
                class="p-3 rounded-xl border flex flex-col items-center text-center space-y-2 transition-all"
                :class="(selectedQuickMatch.winnerId === selectedQuickMatch.player2Id || selectedQuickMatch.winnerTeamId === selectedQuickMatch.team2Id)
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900 border-slate-800'"
              >
                <!-- Avatar / Member Avatars -->
                <div class="flex items-center justify-center -space-x-2">
                  <template v-if="selectedQuickMatch.team2?.members?.length > 0">
                    <img 
                      v-for="m in selectedQuickMatch.team2.members" 
                      :key="m.id"
                      :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" 
                      class="w-8 h-8 rounded-full border-2 border-slate-950 object-cover bg-slate-900" 
                    />
                  </template>
                  <template v-else>
                    <img 
                      :src="selectedQuickMatch.player2?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedQuickMatch.player2?.nickname || '2'}`" 
                      class="w-10 h-10 rounded-full border border-slate-700 object-cover bg-slate-900" 
                    />
                  </template>
                </div>

                <div>
                  <div class="font-bold text-white text-sm font-mono truncate max-w-[140px]">
                    {{ selectedQuickMatch.team2 ? selectedQuickMatch.team2.name : selectedQuickMatch.player2?.nickname }}
                  </div>
                  <div v-if="selectedQuickMatch.team2?.members" class="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                    {{ selectedQuickMatch.team2.members.map((m: any) => m.nickname).join(', ') }}
                  </div>
                </div>

                <!-- Custom Score Input 2 -->
                <div class="w-full pt-1">
                  <label class="block text-[10px] font-mono text-slate-400 mb-1">Score :</label>
                  <input 
                    v-model.number="quickScore2"
                    @keyup.enter="saveQuickMatchCustomScore"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-20 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-bold text-center text-sm focus:border-amber-500 mx-auto block"
                  />
                </div>
              </div>

            </div>

            <!-- Quick 1-Click Outcome Buttons -->
            <div class="pt-3 border-t border-slate-800">
              <label class="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-2 text-center">
                Résultat Rapide (1-Clic) :
              </label>
              <div class="grid grid-cols-4 gap-2 font-mono text-xs font-bold">
                <button
                  type="button"
                  @click="saveQuickMatchWinner('p1')"
                  :disabled="isSavingQuickMatch"
                  class="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-center transition-all disabled:opacity-50 cursor-pointer"
                  :title="`Victoire ${selectedQuickMatch.team1 ? selectedQuickMatch.team1.name : (selectedQuickMatch.player1?.nickname || '1')}`"
                >
                  🏆 {{ selectedQuickMatch.team1 ? selectedQuickMatch.team1.name : (selectedQuickMatch.player1?.nickname || 'Victoire 1') }}
                </button>

                <button
                  type="button"
                  @click="saveQuickMatchWinner('draw')"
                  :disabled="isSavingQuickMatch"
                  class="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-center transition-all disabled:opacity-50 cursor-pointer"
                  title="Match Nul (1 pt chacun)"
                >
                  🤝 Nul
                </button>

                <button
                  type="button"
                  @click="saveQuickMatchWinner('p2')"
                  :disabled="isSavingQuickMatch"
                  class="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-center transition-all disabled:opacity-50 cursor-pointer"
                  :title="`Victoire ${selectedQuickMatch.team2 ? selectedQuickMatch.team2.name : (selectedQuickMatch.player2?.nickname || '2')}`"
                >
                  🏆 {{ selectedQuickMatch.team2 ? selectedQuickMatch.team2.name : (selectedQuickMatch.player2?.nickname || 'Victoire 2') }}
                </button>

                <button
                  type="button"
                  @click="saveQuickMatchWinner('reset')"
                  :disabled="isSavingQuickMatch"
                  class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-center transition-all disabled:opacity-50 cursor-pointer"
                  title="Réinitialiser ce match"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              @click="isQuickMatchModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Annuler
            </button>

            <button
              type="button"
              @click="saveQuickMatchCustomScore"
              :disabled="isSavingQuickMatch || quickScore1 === '' || quickScore2 === ''"
              class="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save class="w-4 h-4" />
              <span>{{ isSavingQuickMatch ? 'Enregistrement...' : 'Valider les Scores' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
