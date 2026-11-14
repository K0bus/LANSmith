<script setup lang="ts">
definePageMeta({
  layout: false
})

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  Trophy, Medal, Award, Gamepad2, Radio, Flame, Sparkles, 
  Swords, ListOrdered, Activity, Layers, ArrowUp, ArrowDown, Minus, Crown,
  Tv, Eye, RefreshCw, Search, ChevronRight, CheckCircle2, Clock, Users,
  Shuffle, ArrowLeft, Calendar, UserCheck
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const tournamentId = computed(() => route.params.id as string)

// View Mode: 'interactive' (default spectator hub) vs 'tv' (auto-rotating broadcast)
const viewMode = computed(() => {
  return route.query.mode === 'tv' ? 'tv' : 'interactive'
})

function setViewMode(mode: 'interactive' | 'tv') {
  router.push({
    query: {
      ...route.query,
      mode: mode === 'tv' ? 'tv' : undefined
    }
  })
}

// Fetch tournament leaderboard & enriched data
const { data: boardData, pending, refresh } = await useFetch<any>(() => `/api/tournaments/${tournamentId.value}/leaderboard`)

// Selected Tab in Interactive Mode: 'overall' | gameId
const activeTab = ref<string>('overall')

// Selected sub-tab when viewing a game: 'standings' | 'rounds' | 'matches'
const activeGameSubTab = ref<'standings' | 'rounds' | 'matches'>('standings')

// Search / Filter query for players
const searchQuery = ref('')

// Live Digital Clock
const currentTime = ref('')
let clockTimer: any = null

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Background Live Polling (Every 8 seconds)
let pollingTimer: any = null
async function syncLive() {
  try {
    await refresh()
  } catch (err) {
    console.error('Erreur live sync:', err)
  }
}

// Extracted Data
const tournament = computed(() => boardData.value?.tournament || null)
const leaderboard = computed(() => boardData.value?.leaderboard || [])
const podium = computed(() => boardData.value?.podium || [])
const games = computed(() => boardData.value?.tournament?.games || [])
const recentScores = computed(() => boardData.value?.recentScores || [])

// Filtered Leaderboard based on search query
const filteredLeaderboard = computed(() => {
  const list = leaderboard.value || []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((entry: any) => {
    return (
      entry.participantName.toLowerCase().includes(q) ||
      (entry.seatNumber && entry.seatNumber.toLowerCase().includes(q))
    )
  })
})

// Current selected game object in interactive mode
const selectedGame = computed(() => {
  if (activeTab.value === 'overall') return null
  return games.value.find((g: any) => g.id === activeTab.value) || null
})

// Filtered game participants based on search query
const filteredGameStandings = computed(() => {
  if (!selectedGame.value?.gameLeaderboard) return []
  const list = selectedGame.value.gameLeaderboard
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return list

  return list.filter((p: any) => {
    return (
      p.participantName.toLowerCase().includes(q) ||
      (p.seatNumber && p.seatNumber.toLowerCase().includes(q))
    )
  })
})

// Group Round-Robin matches by roundNumber for clean display
const matchesByRound = computed(() => {
  if (!selectedGame.value?.matches) return {}
  const groups: Record<number, any[]> = {}
  for (const m of selectedGame.value.matches) {
    const r = m.roundNumber || 1
    if (!groups[r]) groups[r] = []
    groups[r].push(m)
  }
  return groups
})

// Last played game details (from recentScores)
const lastPlayedGameInfo = computed(() => {
  if (!recentScores.value || recentScores.value.length === 0) {
    const g = games.value.find((game: any) => game.roundsCount > 0) || games.value[0]
    if (!g) return null
    return {
      gameName: g.name,
      gameCoverUrl: g.coverUrl,
      roundName: g.roundsCount > 0 ? `${g.roundsCount} manche(s) disputée(s)` : 'Manche 1',
      scoringType: g.scoringType,
      top3: (g.gameLeaderboard || []).slice(0, 3)
    }
  }

  const latest = recentScores.value[0]
  const g = games.value.find((game: any) => game.name === latest.gameName || game.id === latest.gameId)
  
  return {
    gameName: latest.gameName,
    gameCoverUrl: latest.gameCoverUrl,
    roundName: latest.roundName,
    scoringType: latest.scoringType,
    winnerName: latest.participantName,
    winnerAvatar: latest.avatar,
    winnerPoints: latest.points,
    top3: g?.gameLeaderboard ? g.gameLeaderboard.slice(0, 3) : []
  }
})

// ==========================================================
// Automated Rotation System for TV Mode (every 12 seconds)
// ==========================================================
const ROTATION_INTERVAL_MS = 12000
const rotationProgress = ref(0)
const currentViewIndex = ref(0)

const totalViewsCount = computed(() => {
  return 2 + (games.value.length > 0 ? games.value.length : 0)
})

const activeViewType = computed(() => {
  if (currentViewIndex.value === 0) return 'leaderboard'
  if (currentViewIndex.value === 1) return 'last_game'
  return 'game_breakdown'
})

const activeGameIndex = computed(() => {
  if (currentViewIndex.value >= 2) {
    return currentViewIndex.value - 2
  }
  return 0
})

const activeGame = computed(() => {
  if (games.value.length === 0) return null
  return games.value[activeGameIndex.value] || games.value[0]
})

let rotationTimer: any = null
let progressTimer: any = null

function startAutoRotation() {
  stopAutoRotation()

  rotationProgress.value = 0
  const tick = 100

  progressTimer = setInterval(() => {
    rotationProgress.value = Math.min(100, rotationProgress.value + (tick / ROTATION_INTERVAL_MS) * 100)
  }, tick)

  rotationTimer = setInterval(() => {
    rotationProgress.value = 0
    if (totalViewsCount.value > 0) {
      currentViewIndex.value = (currentViewIndex.value + 1) % totalViewsCount.value
    }
  }, ROTATION_INTERVAL_MS)
}

function stopAutoRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer)
    rotationTimer = null
  }
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

// Watch viewMode to start/stop rotation
watch(viewMode, (newMode) => {
  if (newMode === 'tv') {
    startAutoRotation()
  } else {
    stopAutoRotation()
  }
}, { immediate: true })

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  pollingTimer = setInterval(syncLive, 8000)
  if (viewMode.value === 'tv') {
    startAutoRotation()
  }
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (pollingTimer) clearInterval(pollingTimer)
  stopAutoRotation()
})
</script>

<template>
  <!-- ========================================================== -->
  <!-- 1. MODE DIFFUSION ÉCRAN GÉANT (TV / BROADCAST 10-FOOT)     -->
  <!-- ========================================================== -->
  <div 
    v-if="viewMode === 'tv'"
    class="h-screen w-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between p-4 lg:p-6 select-none overflow-hidden relative"
  >
    <!-- Ambient Cyber Glows -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div class="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div class="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-32 left-1/3 w-[32rem] h-96 bg-orange-600/10 rounded-full blur-3xl" />
    </div>

    <!-- TOP BROADCAST HEADER -->
    <header class="relative z-10 w-full flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-6 py-3.5 rounded-2xl shadow-2xl shrink-0">
      
      <!-- Left: Logo & Tournament Title -->
      <div class="flex items-center gap-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20 text-slate-950 font-black text-2xl border border-amber-300/40 shrink-0">
          <Trophy class="w-6 h-6 text-slate-950" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono font-black text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400 uppercase">
              LANSMITH
            </span>
            <span class="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full border border-amber-500/40 uppercase tracking-widest">
              ARENA CAST
            </span>
          </div>
          <p class="text-xs font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
            <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span class="font-bold text-white">{{ tournament?.name || 'Tournoi Multi-Jeux' }}</span>
            <span class="text-slate-600">&bull;</span>
            <span class="text-slate-400 font-mono">{{ tournament?.totalGames || 0 }} ÉPREUVES &bull; {{ tournament?.totalRoundsPlayed || 0 }} MANCHES DISPUTÉES</span>
          </p>
        </div>
      </div>

      <!-- Center: Current Stage Spotlight -->
      <div class="hidden md:flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-5 py-2 rounded-xl shadow-inner">
        <div class="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs tracking-wider">
          <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>DIRECT ARENA</span>
        </div>
        <div class="h-4 w-[1px] bg-slate-800" />
        <div class="font-mono text-sm font-bold text-amber-300 flex items-center gap-2 truncate max-w-xs">
          <Gamepad2 class="w-4 h-4 text-orange-400 shrink-0" />
          <span class="truncate">{{ lastPlayedGameInfo?.gameName || 'Tournoi en cours' }}</span>
        </div>
        <span class="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 uppercase font-bold">
          {{ lastPlayedGameInfo?.roundName || 'Manche Live' }}
        </span>
      </div>

      <!-- Right: View Status Progress, Clock & Exit Button -->
      <div class="flex items-center gap-4">
        <!-- Switch back to Interactive spectator mode -->
        <button
          @click="setViewMode('interactive')"
          class="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          title="Passer en mode interactif pour naviguer librement"
        >
          <Eye class="w-4 h-4 text-cyan-400" />
          <span class="hidden sm:inline">Vue Interactive</span>
        </button>

        <!-- Rotation view label & mini progress bar -->
        <div class="hidden sm:flex flex-col items-end gap-1 font-mono text-xs">
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span class="text-amber-400 font-bold">
              {{ activeViewType === 'leaderboard' ? 'Classement Général' : (activeViewType === 'last_game' ? 'Dernier Jeu Terminé' : activeGame?.name) }}
            </span>
            <span class="text-slate-600">({{ currentViewIndex + 1 }}/{{ totalViewsCount }})</span>
          </div>
          <div class="w-28 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div 
              class="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100 ease-linear"
              :style="{ width: `${rotationProgress}%` }"
            />
          </div>
        </div>

        <!-- Grand Digital Clock -->
        <div class="px-4 py-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center gap-2.5 shadow-inner">
          <span class="w-2 h-2 rounded-full bg-emerald-400" />
          <div class="font-mono text-xl sm:text-2xl font-black tracking-widest text-emerald-400">
            {{ currentTime || '12:00:00' }}
          </div>
        </div>
      </div>

    </header>

    <!-- MAIN BROADCAST CONTENT (Smooth Rotation Between Views) -->
    <main class="relative z-10 flex-1 my-3 overflow-hidden flex flex-col justify-center">

      <!-- VIEW 1: CLASSEMENT GÉNÉRAL CUMULÉ -->
      <div 
        v-if="activeViewType === 'leaderboard'" 
        class="w-full h-full flex flex-col justify-between gap-4 animate-fadeIn overflow-hidden"
      >
        <div class="flex items-center justify-between px-2 shrink-0">
          <div class="flex items-center gap-3">
            <h2 class="font-mono font-black text-xl lg:text-2xl uppercase tracking-wider text-white flex items-center gap-2">
              <span class="text-amber-400">#</span> CLASSEMENT GÉNÉRAL CUMULÉ
            </h2>
            <span class="text-xs font-mono font-bold bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              BARÈME : 1er = {{ tournament?.scoringRules?.[0] || 10 }} pts &bull; 2e = {{ tournament?.scoringRules?.[1] || 8 }} pts
            </span>
          </div>
          <div class="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest hidden sm:flex items-center gap-4">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400" /> TOP 1-3 = PODIUM</span>
            <span class="text-slate-500">&bull;</span>
            <span>{{ leaderboard.length }} JOUEURS CLASSÉS</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-none">
          <div 
            v-for="player in leaderboard" 
            :key="player.participantId"
            class="flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md transition-all shadow-sm"
            :class="{
              'bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-slate-900/90 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]': player.globalRank === 1,
              'bg-slate-900/85 border-slate-400/50': player.globalRank === 2,
              'bg-slate-900/85 border-amber-700/50': player.globalRank === 3,
              'bg-slate-900/70 border-slate-800/80': player.globalRank > 3
            }"
          >
            <div class="flex items-center gap-4 min-w-0">
              <div 
                class="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-xl shrink-0 shadow"
                :class="{
                  'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]': player.globalRank === 1,
                  'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black': player.globalRank === 2,
                  'bg-gradient-to-br from-amber-700 to-amber-600 text-amber-100 font-black': player.globalRank === 3,
                  'bg-slate-950 border border-slate-800 text-slate-400': player.globalRank > 3
                }"
              >
                #{{ player.globalRank }}
              </div>

              <img 
                :src="player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.participantName}`" 
                class="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0 shadow-inner object-cover"
              />

              <div class="truncate">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-lg text-white tracking-wide truncate">
                    {{ player.participantName }}
                  </span>
                  <Crown v-if="player.globalRank === 1" class="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
                </div>
                <div class="text-xs font-mono text-slate-400 mt-0.5 truncate">
                  {{ player.seatNumber || 'Rig LAN' }}
                </div>
              </div>
            </div>

            <div class="hidden md:flex items-center gap-2 font-mono">
              <div 
                v-for="g in games" 
                :key="g.id"
                class="px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center gap-1.5"
              >
                <span class="text-slate-400 truncate max-w-[90px]">{{ g.name }} :</span>
                <span 
                  v-if="player.gameScores[g.id] && player.gameScores[g.id].roundsCount > 0"
                  class="font-bold text-amber-400"
                >
                  +{{ player.gameScores[g.id].tournamentPoints }} pts
                </span>
                <span v-else class="text-slate-600">-</span>
              </div>
            </div>

            <div class="bg-slate-950/90 border border-slate-800 px-5 py-2 rounded-2xl text-right min-w-[100px] shrink-0 shadow-inner">
              <span 
                class="font-mono font-black text-2xl"
                :class="player.globalRank === 1 ? 'text-amber-400' : (player.globalRank === 2 ? 'text-slate-200' : (player.globalRank === 3 ? 'text-amber-500' : 'text-slate-100'))"
              >
                {{ player.totalPoints }}
              </span>
              <span class="text-[10px] font-mono font-bold text-slate-400 uppercase block -mt-1">
                PTS TOTAL
              </span>
            </div>
          </div>

          <div v-if="leaderboard.length === 0" class="flex items-center justify-center py-16 text-slate-500 font-mono text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            Aucun joueur inscrit au tournoi.
          </div>
        </div>
      </div>

      <!-- VIEW 2: DERNIER JEU RÉALISÉ -->
      <div 
        v-else-if="activeViewType === 'last_game'" 
        class="w-full h-full flex flex-col items-center justify-center animate-fadeIn px-4"
      >
        <div class="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-center">
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div class="mb-4">
            <span class="text-xs font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full">
              DERNIER JEU RÉALISÉ &bull; RÉSULTAT DE LA MANCHE
            </span>
            <h2 class="font-mono font-black text-2xl lg:text-4xl text-white mt-2 uppercase tracking-tight">
              {{ lastPlayedGameInfo?.gameName || 'ÉPREUVE RÉCENTE' }}
            </h2>
            <p class="text-xs font-mono text-slate-400 mt-1">
              Points distribués et intégrés au classement général
            </p>
          </div>

          <div v-if="lastPlayedGameInfo?.top3 && lastPlayedGameInfo.top3.length > 0" class="flex items-end justify-center gap-6 lg:gap-10 my-4 h-56">
            <!-- 2nd -->
            <div v-if="lastPlayedGameInfo.top3[1]" class="flex-1 max-w-[180px] flex flex-col items-center">
              <div class="w-14 h-14 rounded-full border-2 border-slate-300 bg-slate-800 flex items-center justify-center shadow-lg mb-2 relative shrink-0">
                <img :src="lastPlayedGameInfo.top3[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${lastPlayedGameInfo.top3[1].participantName}`" class="w-14 h-14 rounded-full object-cover" />
                <span class="absolute -top-2 -right-2 bg-slate-300 text-slate-950 font-mono font-black text-[10px] px-1.5 py-0.5 rounded-full">#2</span>
              </div>
              <div class="font-mono font-bold text-sm text-slate-200 truncate max-w-full">
                {{ lastPlayedGameInfo.top3[1].participantName }}
              </div>
              <div class="text-xs font-mono text-cyan-400 font-bold mb-2">
                +{{ lastPlayedGameInfo.top3[1].tournamentPoints }} PTS
              </div>
              <div class="w-full h-24 bg-gradient-to-t from-slate-800 to-slate-700/80 border-t-4 border-slate-300 rounded-t-2xl flex items-center justify-center">
                <span class="font-mono font-black text-3xl text-slate-400">2</span>
              </div>
            </div>

            <!-- 1st -->
            <div v-if="lastPlayedGameInfo.top3[0]" class="flex-1 max-w-[200px] flex flex-col items-center">
              <div class="relative">
                <Crown class="w-7 h-7 text-amber-400 absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce" />
                <div class="w-18 h-18 rounded-full border-4 border-amber-400 bg-amber-500/20 flex items-center justify-center shadow-xl shadow-amber-500/30 mb-2 relative shrink-0">
                  <img :src="lastPlayedGameInfo.top3[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${lastPlayedGameInfo.top3[0].participantName}`" class="w-18 h-18 rounded-full object-cover" />
                  <span class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 font-mono font-black text-xs px-2 py-0.5 rounded-full">#1</span>
                </div>
              </div>
              <div class="font-mono font-black text-base text-amber-300 truncate max-w-full">
                {{ lastPlayedGameInfo.top3[0].participantName }}
              </div>
              <div class="text-sm font-mono text-amber-400 font-extrabold mb-2">
                +{{ lastPlayedGameInfo.top3[0].tournamentPoints }} PTS
              </div>
              <div class="w-full h-36 bg-gradient-to-t from-amber-950/70 to-amber-600/50 border-t-4 border-amber-400 rounded-t-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span class="font-mono font-black text-4xl text-amber-300">1</span>
              </div>
            </div>

            <!-- 3rd -->
            <div v-if="lastPlayedGameInfo.top3[2]" class="flex-1 max-w-[180px] flex flex-col items-center">
              <div class="w-14 h-14 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center shadow-lg mb-2 relative shrink-0">
                <img :src="lastPlayedGameInfo.top3[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${lastPlayedGameInfo.top3[2].participantName}`" class="w-14 h-14 rounded-full object-cover" />
                <span class="absolute -top-2 -right-2 bg-amber-700 text-amber-100 font-mono font-black text-[10px] px-1.5 py-0.5 rounded-full">#3</span>
              </div>
              <div class="font-mono font-bold text-sm text-slate-200 truncate max-w-full">
                {{ lastPlayedGameInfo.top3[2].participantName }}
              </div>
              <div class="text-xs font-mono text-cyan-400 font-bold mb-2">
                +{{ lastPlayedGameInfo.top3[2].tournamentPoints }} PTS
              </div>
              <div class="w-full h-18 bg-gradient-to-t from-slate-800 to-amber-900/40 border-t-4 border-amber-700 rounded-t-2xl flex items-center justify-center">
                <span class="font-mono font-black text-3xl text-amber-700">3</span>
              </div>
            </div>
          </div>

          <div v-else class="py-10 text-slate-500 font-mono text-sm">
            En attente de la première manche de cette épreuve...
          </div>
        </div>
      </div>

      <!-- VIEW 3: ROTATION PAR ÉPREUVE -->
      <div 
        v-else-if="activeGame" 
        class="w-full h-full flex flex-col justify-between gap-4 animate-fadeIn overflow-hidden"
      >
        <div class="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div class="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div class="flex items-center gap-4 lg:gap-5 min-w-0 z-10">
            <div class="relative shrink-0">
              <img 
                :src="activeGame.coverUrl || 'https://placehold.co/120x160'" 
                class="w-16 sm:w-20 lg:w-24 h-20 sm:h-24 lg:h-28 object-cover rounded-2xl bg-slate-950 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]" 
              />
              <span class="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-mono font-black shadow">
                #{{ activeGameIndex + 1 }}
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                  :class="{
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40': activeGame.scoringType === 'WIN_LOSE',
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40': activeGame.scoringType === 'ROUND_ROBIN',
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40': activeGame.scoringType !== 'WIN_LOSE' && activeGame.scoringType !== 'ROUND_ROBIN'
                  }"
                >
                  {{ activeGame.scoringType === 'WIN_LOSE' ? '⚔️ Victoire / Défaite' : (activeGame.scoringType === 'ROUND_ROBIN' ? '🔁 Round-Robin Toutes Rondes' : '🏆 Scoreboard') }}
                </span>
                <span class="text-xs font-mono font-bold text-slate-400">
                  {{ activeGame.scoringType === 'ROUND_ROBIN' ? (activeGame.completedMatches > 0 ? `${activeGame.completedMatches}/${activeGame.totalMatches} matchs joués` : `${activeGame.totalMatches || 0} matchs au calendrier`) : (activeGame.roundsCount > 0 ? `${activeGame.roundsCount} manche(s) disputée(s)` : 'En attente') }}
                </span>
              </div>

              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight truncate">
                {{ activeGame.name }}
              </h2>

              <p class="text-xs font-mono text-slate-400 mt-0.5">
                Barème : 1er = {{ tournament?.scoringRules?.[0] || 10 }} pts &bull; 2e = {{ tournament?.scoringRules?.[1] || 8 }} pts &bull; 3e = {{ tournament?.scoringRules?.[2] || 6 }} pts
              </p>
            </div>
          </div>

          <div 
            v-if="activeGame.gameLeaderboard && activeGame.gameLeaderboard[0]" 
            class="flex items-center gap-4 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950/90 to-slate-950 border-2 border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.2)] shrink-0 z-10 w-full sm:w-auto justify-between sm:justify-start"
          >
            <div class="relative shrink-0">
              <Crown class="w-6 h-6 text-amber-400 absolute -top-4 -right-2 animate-bounce" />
              <img 
                :src="activeGame.gameLeaderboard[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeGame.gameLeaderboard[0].participantName}`" 
                class="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-slate-950 border-2 border-amber-400 shadow-lg object-cover" 
              />
              <span class="absolute -bottom-1.5 -left-1.5 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-mono font-black text-[10px]">
                TOP 1
              </span>
            </div>

            <div class="min-w-0 text-left">
              <div class="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles class="w-3 h-3" />
                GRAND GAGNANT
              </div>
              <div class="text-lg sm:text-xl font-mono font-black text-white truncate">
                {{ activeGame.gameLeaderboard[0].participantName }}
              </div>
              <div class="text-xs font-mono font-bold text-amber-300 mt-0.5">
                +{{ activeGame.gameLeaderboard[0].tournamentPoints }} PTS TOURNOI <span class="text-slate-400 font-normal">({{ activeGame.gameLeaderboard[0].rawRoundPoints }} pts bruts)</span>
              </div>
            </div>
          </div>

          <div v-else class="px-5 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 shrink-0 z-10">
            En attente de la 1ère manche...
          </div>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
          <div 
            v-for="p in (activeGame.gameLeaderboard || [])" 
            :key="p.participantId"
            class="flex items-center justify-between p-3 lg:p-3.5 rounded-2xl border backdrop-blur-md transition-all shadow-sm"
            :class="{
              'bg-gradient-to-r from-amber-500/20 via-slate-900/90 to-slate-900/90 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]': p.gameRank === 1,
              'bg-slate-900/85 border-slate-400/50': p.gameRank === 2,
              'bg-slate-900/85 border-amber-700/50': p.gameRank === 3,
              'bg-slate-900/70 border-slate-800/80': p.gameRank > 3
            }"
          >
            <div class="flex items-center gap-3 lg:gap-4 min-w-0">
              <div 
                class="w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center font-mono font-black text-lg lg:text-xl shrink-0 shadow"
                :class="{
                  'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]': p.gameRank === 1,
                  'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black': p.gameRank === 2,
                  'bg-gradient-to-br from-amber-700 to-amber-600 text-amber-100 font-black': p.gameRank === 3,
                  'bg-slate-950 border border-slate-800 text-slate-400': p.gameRank > 3
                }"
              >
                #{{ p.gameRank }}
              </div>

              <img 
                :src="p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.participantName}`" 
                class="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0 shadow-inner object-cover" 
              />

              <div class="truncate">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-base lg:text-lg text-white tracking-wide truncate">
                    {{ p.participantName }}
                  </span>
                  <Crown v-if="p.gameRank === 1" class="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                </div>
                <div class="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  {{ p.seatNumber || 'Rig LAN' }}
                </div>
              </div>
            </div>

            <div class="hidden sm:flex items-center gap-3 font-mono">
              <div v-if="p.roundDetails?.length > 0" class="flex flex-wrap items-center gap-1.5">
                <span 
                  v-for="rd in p.roundDetails" 
                  :key="rd.roundNumber"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-300"
                >
                  M{{ rd.roundNumber }}: <span class="font-bold text-cyan-400">{{ rd.points }}pt</span>
                </span>
              </div>

              <div class="text-xs text-slate-400 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800">
                <span class="text-white font-bold">{{ p.rawRoundPoints }}</span> pts bruts ({{ p.roundsCount }} m.)
              </div>
            </div>

            <div class="bg-slate-950/90 border border-slate-800 px-4 py-1.5 rounded-xl text-right min-w-[90px] shrink-0 shadow-inner">
              <span 
                class="font-mono font-black text-xl lg:text-2xl"
                :class="p.gameRank === 1 ? 'text-amber-400' : (p.gameRank === 2 ? 'text-slate-200' : (p.gameRank === 3 ? 'text-amber-500' : 'text-cyan-400'))"
              >
                +{{ p.tournamentPoints }}
              </span>
              <span class="text-[10px] font-mono font-bold text-slate-400 uppercase block -mt-1">
                PTS
              </span>
            </div>
          </div>

          <div v-if="!activeGame.gameLeaderboard || activeGame.gameLeaderboard.length === 0" class="flex items-center justify-center py-16 text-slate-500 font-mono text-sm bg-slate-900/40 rounded-2xl border border-slate-800">
            Aucun score enregistré pour cette épreuve pour l'instant.
          </div>
        </div>
      </div>

    </main>

    <!-- BOTTOM BROADCAST TICKER -->
    <footer class="relative z-10 w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 backdrop-blur-md shadow-2xl shrink-0">
      <div class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 rounded-xl font-mono font-black text-slate-950 text-xs uppercase tracking-wider shrink-0 shadow">
        <Radio class="w-3.5 h-3.5 animate-pulse" />
        <span>INFO ARENA</span>
      </div>

      <div class="overflow-hidden relative flex-1 text-xs lg:text-sm font-mono font-semibold text-slate-300 h-6 flex items-center">
        <div class="inline-block whitespace-nowrap animate-ticker">
          🔥 <span class="text-amber-400 font-bold">DERNIÈRE MANCHE :</span> {{ lastPlayedGameInfo?.gameName || 'En cours' }} &bull; 
          🎮 <span class="text-cyan-400 font-bold">ÉPREUVES TOTALES :</span> {{ tournament?.totalGames || 0 }} jeux au programme &bull; 
          🏆 <span class="text-emerald-400 font-bold">LEADER ACTUEL :</span> {{ podium[0]?.participantName || '-' }} ({{ podium[0]?.totalPoints || 0 }} pts) &bull; 
          ⏱️ <span class="text-slate-400">SYNCHRONISATION LIVE CONTINUE</span>
        </div>
      </div>

      <div class="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-4 shrink-0 text-right">
        <div class="text-[11px] font-mono font-bold text-slate-300 uppercase">Écran Diffusion</div>
        <span class="w-2 h-2 rounded-full bg-emerald-400" />
      </div>
    </footer>

  </div>


  <!-- ========================================================== -->
  <!-- 2. MODE SPECTATEUR INTERACTIF (SMARTPHONE & PC LIBRE ACCÈS) -->
  <!-- ========================================================== -->
  <div 
    v-else
    class="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 flex flex-col relative"
  >
    <!-- Ambient Cyber Glows -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div class="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div class="absolute top-1/3 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div class="absolute bottom-10 left-1/3 w-[32rem] h-96 bg-orange-600/10 rounded-full blur-3xl" />
    </div>

    <!-- STICKY TOP HEADER -->
    <header class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          <!-- Logo & Tournament Identity -->
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0">
              <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Trophy class="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-base sm:text-lg font-black text-white tracking-tight truncate font-sans">
                  {{ tournament?.name || 'Tournoi Multi-Jeux' }}
                </h1>
                <span 
                  class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider shrink-0"
                  :class="{
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40': tournament?.status === 'IN_PROGRESS',
                    'bg-blue-500/20 text-blue-300 border border-blue-500/40': tournament?.status === 'COMPLETED',
                    'bg-slate-800 text-slate-400': tournament?.status === 'DRAFT'
                  }"
                >
                  {{ tournament?.status === 'IN_PROGRESS' ? 'En Direct' : (tournament?.status === 'COMPLETED' ? 'Terminé' : 'Brouillon') }}
                </span>
                <span class="hidden md:inline-flex items-center gap-1 text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
                  <UserCheck class="w-3 h-3 text-cyan-400" />
                  <span>Lecture Seule</span>
                </span>
              </div>
              <p class="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                {{ tournament?.totalGames || 0 }} épreuves &bull; {{ tournament?.totalRoundsPlayed || 0 }} manches disputées &bull; {{ leaderboard.length }} participants
              </p>
            </div>
          </div>

          <!-- Controls: Sync Live & Switch to TV mode -->
          <div class="flex items-center gap-2 sm:gap-3 shrink-0">
            <!-- Digital clock on larger screens -->
            <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span class="text-emerald-400 font-bold">{{ currentTime || '12:00:00' }}</span>
            </div>

            <!-- Manual Refresh Button -->
            <button
              @click="syncLive"
              class="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono"
              title="Rafraîchir les scores"
            >
              <RefreshCw class="w-4 h-4 text-amber-400" :class="{ 'animate-spin': pending }" />
              <span class="hidden sm:inline">Actualiser</span>
            </button>

            <!-- TV Cast Mode Toggle -->
            <button
              @click="setViewMode('tv')"
              class="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all cursor-pointer"
              title="Ouvrir le mode plein écran pour vidéoprojecteur / TV"
            >
              <Tv class="w-4 h-4 text-amber-400" />
              <span class="hidden sm:inline">Mode Écran Géant</span>
              <span class="sm:hidden">TV</span>
            </button>
          </div>

        </div>

        <!-- ========================================================== -->
        <!-- HORIZONTAL SCROLLABLE TABS (OVERALL + EACH GAME)            -->
        <!-- ========================================================== -->
        <nav class="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none border-t border-slate-800/60">
          
          <!-- Overall Leaderboard Tab -->
          <button
            @click="activeTab = 'overall'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer"
            :class="activeTab === 'overall'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'"
          >
            <Trophy class="w-4 h-4" />
            <span>CLASSEMENT GÉNÉRAL</span>
            <span 
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="activeTab === 'overall' ? 'bg-slate-950/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'"
            >
              {{ leaderboard.length }}
            </span>
          </button>

          <div class="h-4 w-[1px] bg-slate-800 shrink-0" />

          <!-- Dynamic Game Tabs -->
          <button
            v-for="(g, idx) in games"
            :key="g.id"
            @click="activeTab = g.id; activeGameSubTab = 'standings'"
            class="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer group"
            :class="activeTab === g.id
              ? 'bg-slate-900 text-cyan-300 border border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/80'"
          >
            <span class="text-[10px] text-slate-500 font-mono">#{{ idx + 1 }}</span>
            <img 
              v-if="g.coverUrl" 
              :src="g.coverUrl" 
              class="w-4 h-5 object-cover rounded bg-slate-800 shrink-0" 
            />
            <span class="truncate max-w-[120px] font-bold">{{ g.name }}</span>

            <!-- Mini badge status -->
            <span 
              class="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0"
              :class="{
                'bg-rose-950/80 text-rose-300': g.scoringType === 'WIN_LOSE',
                'bg-cyan-950/80 text-cyan-300': g.scoringType === 'ROUND_ROBIN',
                'bg-amber-950/80 text-amber-300': g.scoringType !== 'WIN_LOSE' && g.scoringType !== 'ROUND_ROBIN'
              }"
            >
              {{ g.scoringType === 'ROUND_ROBIN' ? `${g.completedMatches || 0}/${g.totalMatches || 0}m` : `${g.roundsCount || 0}m` }}
            </span>
          </button>

        </nav>
      </div>
    </header>

    <!-- ========================================================== -->
    <!-- MAIN INTERACTIVE CONTENT AREA                              -->
    <!-- ========================================================== -->
    <main class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

      <!-- ========================================================== -->
      <!-- TAB 1: CLASSEMENT GÉNÉRAL (OVERALL TOURNAMENT HUB)         -->
      <!-- ========================================================== -->
      <div v-if="activeTab === 'overall'" class="space-y-8 animate-fadeIn">
        
        <!-- Summary Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div class="cyber-card p-4 border-slate-800 bg-slate-900/70">
            <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 class="w-3.5 h-3.5 text-amber-400" />
              <span>Épreuves</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {{ tournament?.totalGames || 0 }}
            </div>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5">
              {{ tournament?.completedGames || 0 }} lancées ({{ tournament?.progressPercent || 0 }}%)
            </p>
          </div>

          <div class="cyber-card p-4 border-slate-800 bg-slate-900/70">
            <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-cyan-400" />
              <span>Manches & Matchs</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1">
              {{ tournament?.totalRoundsPlayed || 0 }}
            </div>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5">
              Manches clôturées
            </p>
          </div>

          <div class="cyber-card p-4 border-slate-800 bg-slate-900/70">
            <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users class="w-3.5 h-3.5 text-emerald-400" />
              <span>Participants</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1">
              {{ leaderboard.length }}
            </div>
            <p class="text-[10px] text-slate-500 font-mono mt-0.5">
              Joueurs enregistrés
            </p>
          </div>

          <div class="cyber-card p-4 border-slate-800 bg-slate-900/70">
            <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Crown class="w-3.5 h-3.5 text-amber-400" />
              <span>Leader Actuel</span>
            </div>
            <div class="text-base sm:text-lg font-black font-mono text-amber-400 mt-1 truncate">
              {{ podium[0]?.participantName || '-' }}
            </div>
            <p class="text-[10px] text-amber-300/80 font-mono mt-0.5">
              {{ podium[0]?.totalPoints || 0 }} points
            </p>
          </div>
        </div>

        <!-- PODIUM (Top 3) -->
        <div v-if="podium.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          
          <!-- 2nd Place (Silver) -->
          <div v-if="podium[1]" class="cyber-card p-6 border-slate-700/80 bg-gradient-to-b from-slate-800/40 to-slate-900 text-center flex flex-col items-center justify-between order-2 md:order-1 relative overflow-hidden">
            <div class="absolute top-0 inset-x-0 h-1 bg-slate-400" />
            <div class="w-12 h-12 rounded-full bg-slate-700/80 border border-slate-400 text-slate-200 flex items-center justify-center font-black text-xl mb-3 shadow">
              2
            </div>
            <img :src="podium[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[1].participantName}`" class="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-slate-400 shadow-lg mb-3 object-cover" />
            <div>
              <h3 class="font-bold text-lg text-white">{{ podium[1].participantName }}</h3>
              <p class="text-xs text-slate-400 font-mono">{{ podium[1].seatNumber || 'Rig LAN' }}</p>
            </div>
            <div class="mt-4 px-5 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 font-mono font-black text-lg">
              {{ podium[1].totalPoints }} pts
            </div>
          </div>

          <!-- 1st Place (Gold / Champion) -->
          <div v-if="podium[0]" class="cyber-card p-6 border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-slate-900 text-center flex flex-col items-center justify-between order-1 md:order-2 shadow-[0_0_30px_rgba(245,158,11,0.25)] relative overflow-hidden transform md:-translate-y-2">
            <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_#f59e0b]" />
            <div class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-2xl mb-3 shadow-glow-amber">
              👑 1
            </div>
            <img :src="podium[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[0].participantName}`" class="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-3 object-cover" />
            <div>
              <h3 class="font-extrabold text-xl text-amber-300 drop-shadow">{{ podium[0].participantName }}</h3>
              <p class="text-xs text-amber-400/80 font-mono">{{ podium[0].seatNumber || 'Rig LAN' }}</p>
            </div>
            <div class="mt-4 px-6 py-2 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-mono font-black text-2xl shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              {{ podium[0].totalPoints }} pts
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div v-if="podium[2]" class="cyber-card p-6 border-orange-800/80 bg-gradient-to-b from-orange-950/20 to-slate-900 text-center flex flex-col items-center justify-between order-3 relative overflow-hidden">
            <div class="absolute top-0 inset-x-0 h-1 bg-amber-700" />
            <div class="w-12 h-12 rounded-full bg-amber-900/80 border border-amber-700 text-amber-400 flex items-center justify-center font-black text-xl mb-3 shadow">
              3
            </div>
            <img :src="podium[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[2].participantName}`" class="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-700 shadow-lg mb-3 object-cover" />
            <div>
              <h3 class="font-bold text-lg text-white">{{ podium[2].participantName }}</h3>
              <p class="text-xs text-slate-400 font-mono">{{ podium[2].seatNumber || 'Rig LAN' }}</p>
            </div>
            <div class="mt-4 px-5 py-1.5 rounded-full bg-slate-800 border border-amber-900 text-amber-400 font-mono font-black text-lg">
              {{ podium[2].totalPoints }} pts
            </div>
          </div>

        </div>

        <!-- FULL LEADERBOARD TABLE -->
        <div class="cyber-card border-slate-800 overflow-hidden shadow-2xl">
          
          <!-- Table Header bar with Search -->
          <div class="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 class="font-bold text-base text-white flex items-center gap-2">
                <Trophy class="w-4 h-4 text-amber-400" />
                <span>Tableau Général des Scores en Direct</span>
              </h2>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Cumul automatique des points de toutes les épreuves &bull; Cliquez sur un jeu pour explorer ses manches
              </p>
            </div>

            <!-- Search input -->
            <div class="relative w-full sm:w-64">
              <Search class="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Rechercher un joueur..."
                class="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr class="bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                  <th class="p-4 w-16 text-center">Rang</th>
                  <th class="p-4 min-w-[200px] font-sans">Joueur</th>
                  
                  <!-- Dynamic Game Columns -->
                  <th 
                    v-for="g in games" 
                    :key="g.id"
                    class="p-4 text-center min-w-[130px] cursor-pointer hover:bg-slate-900/60 transition-colors"
                    @click="activeTab = g.id"
                    :title="`Voir les détails de ${g.name}`"
                  >
                    <div class="flex flex-col items-center gap-0.5">
                      <span class="truncate max-w-[120px] font-bold text-white hover:text-cyan-300">{{ g.name }}</span>
                      <div class="flex items-center gap-1 text-[9px]">
                        <span 
                          class="px-1 py-0.2 rounded font-bold uppercase"
                          :class="{
                            'text-rose-400 bg-rose-950/60': g.scoringType === 'WIN_LOSE',
                            'text-cyan-400 bg-cyan-950/60': g.scoringType === 'ROUND_ROBIN',
                            'text-amber-400 bg-amber-950/60': g.scoringType !== 'WIN_LOSE' && g.scoringType !== 'ROUND_ROBIN'
                          }"
                        >
                          {{ g.scoringType === 'WIN_LOSE' ? '⚔️ W/L' : (g.scoringType === 'ROUND_ROBIN' ? '🔁 RR' : '🏆 Rang') }}
                        </span>
                        <span class="text-slate-500">
                          {{ g.scoringType === 'ROUND_ROBIN' ? `(${g.completedMatches || 0}/${g.totalMatches || 0})` : `(${g.roundsCount}m)` }}
                        </span>
                      </div>
                    </div>
                  </th>

                  <th class="p-4 text-right min-w-[120px] font-bold text-amber-400">Total Points</th>
                </tr>
              </thead>

              <tbody class="divide-y divide-slate-800/60">
                <tr 
                  v-for="entry in filteredLeaderboard" 
                  :key="entry.participantId"
                  class="hover:bg-slate-900/50 transition-colors"
                  :class="{
                    'bg-amber-500/5': entry.globalRank === 1,
                    'bg-slate-800/20': entry.globalRank === 2,
                    'bg-orange-500/5': entry.globalRank === 3
                  }"
                >
                  <!-- Rank badge -->
                  <td class="p-4 text-center">
                    <span 
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs"
                      :class="{
                        'bg-amber-400 text-slate-950 shadow-[0_0_10px_#f59e0b]': entry.globalRank === 1,
                        'bg-slate-300 text-slate-950': entry.globalRank === 2,
                        'bg-amber-700 text-white': entry.globalRank === 3,
                        'bg-slate-800 text-slate-400': entry.globalRank > 3
                      }"
                    >
                      {{ entry.globalRank }}
                    </span>
                  </td>

                  <!-- Participant Info -->
                  <td class="p-4 font-sans">
                    <div class="flex items-center gap-3">
                      <img :src="entry.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.participantName}`" class="w-8 h-8 rounded-full bg-slate-800 object-cover" />
                      <div>
                        <div class="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{{ entry.participantName }}</span>
                          <Crown v-if="entry.globalRank === 1" class="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div class="text-[11px] text-slate-400 font-mono">{{ entry.seatNumber || 'Rig LAN' }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Scores per game -->
                  <td 
                    v-for="g in games" 
                    :key="g.id"
                    class="p-4 text-center cursor-pointer hover:bg-slate-900/40 transition-colors"
                    @click="activeTab = g.id"
                  >
                    <div v-if="entry.gameScores[g.id]" class="space-y-1">
                      <div class="flex items-center justify-center gap-1.5">
                        <span 
                          class="inline-block px-2 py-0.5 rounded font-bold text-xs"
                          :class="entry.gameScores[g.id].tournamentPoints > 0 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                            : 'bg-slate-900 text-slate-500'"
                        >
                          +{{ entry.gameScores[g.id].tournamentPoints }} pts
                        </span>
                        <span 
                          v-if="entry.gameScores[g.id].gameRank" 
                          class="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400"
                        >
                          #{{ entry.gameScores[g.id].gameRank }}
                        </span>
                      </div>

                      <div class="text-[10px] text-slate-400 font-mono">
                        <template v-if="entry.gameScores[g.id].scoringType === 'ROUND_ROBIN' && entry.gameScores[g.id].roundRobinStats">
                          <span class="text-amber-400 font-bold">{{ entry.gameScores[g.id].roundRobinStats.rrPoints }} pts RR</span>
                          <span class="text-slate-500 ml-1">({{ entry.gameScores[g.id].roundRobinStats.wins }}V-{{ entry.gameScores[g.id].roundRobinStats.draws }}N-{{ entry.gameScores[g.id].roundRobinStats.losses }}D)</span>
                        </template>
                        <template v-else>
                          <span class="text-slate-500 font-semibold">{{ entry.gameScores[g.id].rawRoundPoints }} pts m.</span>
                          <span v-if="entry.gameScores[g.id].roundDetails?.length > 1" class="text-slate-600 ml-1">
                            ({{ entry.gameScores[g.id].roundDetails.map((rd: any) => `M${rd.roundNumber}:${rd.points}`).join(' · ') }})
                          </span>
                        </template>
                      </div>
                    </div>
                    <span v-else class="text-slate-700">-</span>
                  </td>

                  <!-- Total Points -->
                  <td class="p-4 text-right">
                    <span class="text-base font-black text-amber-400">
                      {{ entry.totalPoints }}
                    </span>
                    <span class="text-[11px] text-slate-500 ml-1">pts</span>
                  </td>
                </tr>

                <tr v-if="filteredLeaderboard.length === 0">
                  <td :colspan="3 + games.length" class="p-8 text-center text-slate-500 font-mono text-xs">
                    Aucun joueur trouvé correspondant à la recherche.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- RECENT ACTIVITY FEED -->
        <div v-if="recentScores.length > 0" class="cyber-card p-5 border-slate-800">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Radio class="w-4 h-4 text-amber-400 animate-pulse" />
              <h3 class="font-bold text-sm text-white font-mono uppercase tracking-wider">
                Flux des Derniers Scores Validés
              </h3>
            </div>
            <span class="text-xs font-mono text-slate-400">
              {{ recentScores.length }} résultats récents
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div 
              v-for="score in recentScores.slice(0, 6)" 
              :key="score.id"
              class="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <img :src="score.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${score.participantName}`" class="w-8 h-8 rounded-lg bg-slate-800 object-cover shrink-0" />
                <div class="min-w-0">
                  <div class="font-bold text-white truncate">{{ score.participantName }}</div>
                  <div class="text-[10px] text-slate-400 truncate">{{ score.gameName }} &bull; {{ score.roundName }}</div>
                </div>
              </div>

              <div class="text-right shrink-0">
                <span 
                  class="px-2 py-0.5 rounded font-bold"
                  :class="score.isWinner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-900 text-slate-400'"
                >
                  {{ score.rawScore ? score.rawScore : `+${score.points} pts` }}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>


      <!-- ========================================================== -->
      <!-- TAB 2: VUE PAR ÉPREUVE (SELECTED GAME DEEP DIVE)           -->
      <!-- ========================================================== -->
      <div v-else-if="selectedGame" class="space-y-6 animate-fadeIn">
        
        <!-- Game Hero Banner -->
        <div class="cyber-card p-5 lg:p-6 border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div class="absolute -top-12 -left-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div class="absolute -bottom-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div class="flex items-center gap-4 lg:gap-6 min-w-0 z-10">
            <div class="relative shrink-0">
              <img 
                :src="selectedGame.coverUrl || 'https://placehold.co/120x160'" 
                class="w-20 sm:w-24 h-26 sm:h-32 object-cover rounded-2xl bg-slate-950 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]" 
              />
              <span class="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-mono font-black shadow">
                #{{ selectedGame.order || 1 }}
              </span>
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span 
                  class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                  :class="{
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40': selectedGame.scoringType === 'WIN_LOSE',
                    'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40': selectedGame.scoringType === 'ROUND_ROBIN',
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40': selectedGame.scoringType !== 'WIN_LOSE' && selectedGame.scoringType !== 'ROUND_ROBIN'
                  }"
                >
                  {{ selectedGame.scoringType === 'WIN_LOSE' ? '⚔️ Victoire / Défaite' : (selectedGame.scoringType === 'ROUND_ROBIN' ? '🔁 Round-Robin Toutes Rondes' : '🏆 Scoreboard') }}
                </span>
                <span class="text-xs font-mono font-bold text-slate-400">
                  {{ selectedGame.scoringType === 'ROUND_ROBIN' ? (selectedGame.completedMatches > 0 ? `${selectedGame.completedMatches}/${selectedGame.totalMatches} matchs joués` : `${selectedGame.totalMatches || 0} matchs au calendrier`) : (selectedGame.roundsCount > 0 ? `${selectedGame.roundsCount} manche(s) disputée(s)` : 'En attente') }}
                </span>
              </div>

              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-mono font-black text-white tracking-tight truncate">
                {{ selectedGame.name }}
              </h2>

              <p class="text-xs font-mono text-slate-400 mt-1">
                Barème Tournoi : 1er = {{ tournament?.scoringRules?.[0] || 10 }} pts &bull; 2e = {{ tournament?.scoringRules?.[1] || 8 }} pts &bull; 3e = {{ tournament?.scoringRules?.[2] || 6 }} pts
              </p>
            </div>
          </div>

          <!-- Spotlight: Grand Gagnant de ce jeu -->
          <div 
            v-if="selectedGame.gameLeaderboard && selectedGame.gameLeaderboard[0]" 
            class="flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950/90 to-slate-950 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0 z-10 w-full md:w-auto"
          >
            <div class="relative shrink-0">
              <Crown class="w-5 h-5 text-amber-400 absolute -top-3.5 -right-1 animate-bounce" />
              <img 
                :src="selectedGame.gameLeaderboard[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedGame.gameLeaderboard[0].participantName}`" 
                class="w-12 h-12 rounded-xl bg-slate-950 border border-amber-400 shadow-md object-cover" 
              />
              <span class="absolute -bottom-1 -left-1 px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-mono font-black text-[9px]">
                TOP 1
              </span>
            </div>

            <div class="min-w-0">
              <div class="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles class="w-3 h-3" />
                VAINQUEUR DE L'ÉPREUVE
              </div>
              <div class="text-base font-mono font-black text-white truncate">
                {{ selectedGame.gameLeaderboard[0].participantName }}
              </div>
              <div class="text-xs font-mono font-bold text-amber-300">
                +{{ selectedGame.gameLeaderboard[0].tournamentPoints }} pts tournoi
              </div>
            </div>
          </div>

        </div>

        <!-- Sub-tabs: Standings vs Detailed Rounds / Matches -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <button
              @click="activeGameSubTab = 'standings'"
              class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              :class="activeGameSubTab === 'standings'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'"
            >
              <Trophy class="w-3.5 h-3.5" />
              <span>Classement de l'Épreuve</span>
            </button>

            <!-- For Scoreboard / Win-Lose: Detailed Rounds -->
            <button
              v-if="selectedGame.scoringType !== 'ROUND_ROBIN'"
              @click="activeGameSubTab = 'rounds'"
              class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              :class="activeGameSubTab === 'rounds'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'"
            >
              <Layers class="w-3.5 h-3.5" />
              <span>Détail des Manches ({{ selectedGame.rounds?.length || 0 }})</span>
            </button>

            <!-- For Round Robin: Detailed Matches -->
            <button
              v-if="selectedGame.scoringType === 'ROUND_ROBIN'"
              @click="activeGameSubTab = 'matches'"
              class="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              :class="activeGameSubTab === 'matches'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'"
            >
              <Swords class="w-3.5 h-3.5" />
              <span>Matchs & Calendrier ({{ selectedGame.matches?.length || 0 }})</span>
            </button>
          </div>

          <div class="relative w-full sm:w-56">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Filtrer un joueur..."
              class="w-full pl-8 pr-3 py-1.2 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder-slate-500 outline-none font-mono"
            />
          </div>
        </div>

        <!-- ========================================================== -->
        <!-- SUB-VIEW A: CLASSEMENT DE L'ÉPREUVE (STANDINGS)            -->
        <!-- ========================================================== -->
        <div v-if="activeGameSubTab === 'standings'" class="space-y-4">
          <div class="cyber-card border-slate-800 overflow-hidden shadow-xl">
            <table class="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr class="bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                  <th class="p-3.5 w-14 text-center">Rang</th>
                  <th class="p-3.5 min-w-[200px] font-sans">Joueur</th>
                  <th class="p-3.5 text-center min-w-[120px]">Points Bruts</th>
                  <th class="p-3.5 text-center min-w-[160px]">Détail / Statistiques</th>
                  <th class="p-3.5 text-right min-w-[120px] font-bold text-amber-400">Points Tournoi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                <tr 
                  v-for="p in filteredGameStandings" 
                  :key="p.participantId"
                  class="hover:bg-slate-900/50 transition-colors"
                  :class="{
                    'bg-amber-500/5': p.gameRank === 1,
                    'bg-slate-800/20': p.gameRank === 2,
                    'bg-orange-500/5': p.gameRank === 3
                  }"
                >
                  <td class="p-3.5 text-center">
                    <span 
                      class="inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs"
                      :class="{
                        'bg-amber-400 text-slate-950 shadow-[0_0_10px_#f59e0b]': p.gameRank === 1,
                        'bg-slate-300 text-slate-950': p.gameRank === 2,
                        'bg-amber-700 text-white': p.gameRank === 3,
                        'bg-slate-800 text-slate-400': p.gameRank > 3
                      }"
                    >
                      #{{ p.gameRank }}
                    </span>
                  </td>

                  <td class="p-3.5 font-sans">
                    <div class="flex items-center gap-3">
                      <img :src="p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.participantName}`" class="w-8 h-8 rounded-full bg-slate-800 object-cover" />
                      <div>
                        <div class="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{{ p.participantName }}</span>
                          <Crown v-if="p.gameRank === 1" class="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div class="text-[11px] text-slate-400 font-mono">{{ p.seatNumber || 'Rig LAN' }}</div>
                      </div>
                    </div>
                  </td>

                  <td class="p-3.5 text-center font-bold text-white">
                    {{ p.rawRoundPoints }} <span class="text-[10px] text-slate-500 font-normal">pts</span>
                  </td>

                  <!-- Details breakdown (RR stats or round breakdown) -->
                  <td class="p-3.5 text-center">
                    <template v-if="selectedGame.scoringType === 'ROUND_ROBIN' && p.roundRobinStats">
                      <span class="text-amber-400 font-bold">{{ p.roundRobinStats.rrPoints }} pts RR</span>
                      <span class="text-slate-500 ml-1.5">({{ p.roundRobinStats.wins }}V &bull; {{ p.roundRobinStats.draws }}N &bull; {{ p.roundRobinStats.losses }}D)</span>
                    </template>
                    <template v-else-if="p.roundDetails && p.roundDetails.length > 0">
                      <div class="flex flex-wrap items-center justify-center gap-1">
                        <span 
                          v-for="rd in p.roundDetails" 
                          :key="rd.roundNumber"
                          class="px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-300"
                        >
                          M{{ rd.roundNumber }}: <span class="text-cyan-400 font-bold">{{ rd.points }}</span>
                        </span>
                      </div>
                    </template>
                    <span v-else class="text-slate-600">-</span>
                  </td>

                  <td class="p-3.5 text-right font-black text-amber-400 text-sm">
                    +{{ p.tournamentPoints }} pts
                  </td>
                </tr>

                <tr v-if="filteredGameStandings.length === 0">
                  <td colspan="5" class="p-8 text-center text-slate-500 font-mono text-xs">
                    Aucun résultat enregistré pour cette épreuve pour le moment.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ========================================================== -->
        <!-- SUB-VIEW B: DÉTAIL DES MANCHES (SCOREBOARD & WIN/LOSE)     -->
        <!-- ========================================================== -->
        <div v-else-if="activeGameSubTab === 'rounds'" class="space-y-6">
          <div v-if="!selectedGame.rounds || selectedGame.rounds.length === 0" class="cyber-card p-12 text-center text-slate-500 font-mono text-sm border-slate-800">
            Aucune manche n'a encore été enregistrée pour cette épreuve.
          </div>

          <div 
            v-for="round in selectedGame.rounds" 
            :key="round.id"
            class="cyber-card border-slate-800 overflow-hidden shadow-lg"
          >
            <!-- Round Header -->
            <div class="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-xs uppercase">
                  Manche {{ round.roundNumber }}
                </span>
                <span class="text-xs font-mono text-slate-400">{{ round.name || `Manche ${round.roundNumber}` }}</span>
              </div>
              <span class="text-xs font-mono text-slate-500">
                {{ round.scores?.length || 0 }} scores enregistrés
              </span>
            </div>

            <!-- Round Scores Grid / Table -->
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr class="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase">
                    <th class="p-3 w-12 text-center">Rang</th>
                    <th class="p-3 min-w-[180px] font-sans">Joueur</th>
                    <th class="p-3 text-center min-w-[100px]">Score Brut</th>
                    <th class="p-3 text-center min-w-[100px]">Résultat</th>
                    <th class="p-3 text-right min-w-[100px]">Points Attribués</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/40">
                  <tr 
                    v-for="(score, sIdx) in round.scores" 
                    :key="score.id"
                    class="hover:bg-slate-900/40"
                    :class="{ 'bg-amber-500/5': score.isWinner || (score.rank === 1) }"
                  >
                    <td class="p-3 text-center">
                      <span 
                        class="inline-flex items-center justify-center w-6 h-6 rounded font-bold text-[11px]"
                        :class="score.isWinner || score.rank === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'"
                      >
                        {{ score.rank ?? (sIdx + 1) }}
                      </span>
                    </td>
                    <td class="p-3 font-sans">
                      <div class="flex items-center gap-2.5">
                        <img :src="score.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${score.participantName}`" class="w-6 h-6 rounded-full bg-slate-800 object-cover" />
                        <span class="font-bold text-white text-xs">{{ score.participantName }}</span>
                      </div>
                    </td>
                    <td class="p-3 text-center text-slate-300">
                      {{ score.rawScore !== null && score.rawScore !== undefined ? score.rawScore : '-' }}
                    </td>
                    <td class="p-3 text-center">
                      <span 
                        v-if="score.isWinner" 
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      >
                        🏆 Vainqueur
                      </span>
                      <span 
                        v-else-if="score.isWinner === false"
                        class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400"
                      >
                        Défaite
                      </span>
                      <span v-else class="text-slate-600">-</span>
                    </td>
                    <td class="p-3 text-right font-bold text-amber-400">
                      +{{ score.points }} pts
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ========================================================== -->
        <!-- SUB-VIEW C: MATCHS & CALENDRIER ROUND-ROBIN                -->
        <!-- ========================================================== -->
        <div v-else-if="activeGameSubTab === 'matches'" class="space-y-6">
          <div v-if="!selectedGame.matches || selectedGame.matches.length === 0" class="cyber-card p-12 text-center text-slate-500 font-mono text-sm border-slate-800">
            Aucun match de Round-Robin n'a encore été généré pour cette épreuve.
          </div>

          <div 
            v-for="(matches, roundNum) in matchesByRound" 
            :key="roundNum"
            class="space-y-3"
          >
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-cyan-400" />
              <h4 class="font-mono font-bold text-xs uppercase tracking-wider text-cyan-300">
                Tour {{ roundNum }} ({{ matches.filter(m => m.status === 'COMPLETED').length }} / {{ matches.length }} terminés)
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div 
                v-for="m in matches" 
                :key="m.id"
                class="p-3.5 rounded-2xl border transition-all text-xs font-mono"
                :class="m.status === 'COMPLETED'
                  ? 'bg-slate-900/90 border-slate-800 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/60 border-dashed opacity-80'"
              >
                <!-- Match Sub-header -->
                <div class="flex items-center justify-between text-[10px] text-slate-500 mb-2.5 pb-2 border-b border-slate-800/60">
                  <span>Match #{{ m.matchNumber }}</span>
                  <span 
                    class="px-2 py-0.2 rounded font-bold uppercase"
                    :class="m.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'"
                  >
                    {{ m.status === 'COMPLETED' ? 'Terminé' : 'En attente' }}
                  </span>
                </div>

                <!-- Opponents Row -->
                <div class="space-y-2">
                  <!-- Player / Team 1 -->
                  <div 
                    class="flex items-center justify-between p-2 rounded-xl transition-colors"
                    :class="{
                      'bg-amber-500/15 border border-amber-500/40 text-amber-200': m.winnerId === m.player1?.id || m.winnerTeamId === m.team1?.id,
                      'bg-slate-950/70 border border-slate-800/80 text-slate-300': !(m.winnerId === m.player1?.id || m.winnerTeamId === m.team1?.id)
                    }"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <img 
                        v-if="m.player1?.avatar" 
                        :src="m.player1.avatar" 
                        class="w-6 h-6 rounded-full bg-slate-800 object-cover shrink-0" 
                      />
                      <span class="font-bold truncate">{{ m.team1?.name || m.player1?.name || 'Joueur 1' }}</span>
                      <Crown v-if="m.winnerId === m.player1?.id || m.winnerTeamId === m.team1?.id" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </div>
                    <span class="font-black text-sm px-2">
                      {{ m.player1Score !== null && m.player1Score !== undefined ? m.player1Score : '-' }}
                    </span>
                  </div>

                  <!-- VS Divider -->
                  <div class="text-center text-[10px] text-slate-600 font-bold uppercase">VS</div>

                  <!-- Player / Team 2 -->
                  <div 
                    class="flex items-center justify-between p-2 rounded-xl transition-colors"
                    :class="{
                      'bg-amber-500/15 border border-amber-500/40 text-amber-200': m.winnerId === m.player2?.id || m.winnerTeamId === m.team2?.id,
                      'bg-slate-950/70 border border-slate-800/80 text-slate-300': !(m.winnerId === m.player2?.id || m.winnerTeamId === m.team2?.id)
                    }"
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <img 
                        v-if="m.player2?.avatar" 
                        :src="m.player2.avatar" 
                        class="w-6 h-6 rounded-full bg-slate-800 object-cover shrink-0" 
                      />
                      <span class="font-bold truncate">{{ m.team2?.name || m.player2?.name || 'Joueur 2' }}</span>
                      <Crown v-if="m.winnerId === m.player2?.id || m.winnerTeamId === m.team2?.id" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </div>
                    <span class="font-black text-sm px-2">
                      {{ m.player2Score !== null && m.player2Score !== undefined ? m.player2Score : '-' }}
                    </span>
                  </div>
                </div>

                <div v-if="m.isDraw" class="mt-2 text-center text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 rounded py-0.5">
                  Match Nul
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </main>

    <!-- FOOTER -->
    <footer class="relative z-10 border-t border-slate-800/80 bg-slate-950 py-4 mt-12 text-center text-xs font-mono text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Activity class="w-4 h-4 text-amber-400" />
          <span class="text-slate-400 font-bold">LANSMITH FORGE</span>
          <span>&bull; Vue Spectateur & Classements Live</span>
        </div>
        <div class="flex items-center gap-3 text-[11px]">
          <span class="flex items-center gap-1.5 text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Synchronisé en direct
          </span>
          <span class="text-slate-700">&bull;</span>
          <button @click="setViewMode('tv')" class="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1">
            <Tv class="w-3.5 h-3.5" />
            Mode TV Cast
          </button>
        </div>
      </div>
    </footer>

  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes tickerSlide {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.animate-ticker {
  animation: tickerSlide 26s linear infinite;
}
</style>
