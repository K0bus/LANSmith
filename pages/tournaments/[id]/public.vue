<script setup lang="ts">
definePageMeta({
  layout: false
})

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Trophy, Medal, Award, Gamepad2, Radio, Flame, Sparkles, 
  Swords, ListOrdered, Activity, Layers, ArrowUp, ArrowDown, Minus, Crown
} from 'lucide-vue-next'

const route = useRoute()
const tournamentId = computed(() => route.params.id as string)

// Fetch tournament leaderboard & real data
const { data: boardData, refresh } = await useFetch<any>(() => `/api/tournaments/${tournamentId.value}/leaderboard`)

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

// Background Live Polling (Every 6 seconds)
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

// Split leaderboard into 2 columns for maximum TV / big-screen legibility
const leftColumn = computed(() => {
  const half = Math.ceil(leaderboard.value.length / 2)
  return leaderboard.value.slice(0, half)
})

const rightColumn = computed(() => {
  const half = Math.ceil(leaderboard.value.length / 2)
  return leaderboard.value.slice(half)
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
  // Find game corresponding to latest
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

// Automated Rotation System (TV broadcast rotation every 12 seconds)
// Views:
// 'leaderboard' -> Full 2-column leaderboard
// 'last_game'   -> Podium & Results of last played game
// 'game_breakdown' -> Dynamic cycling through specific games
const ROTATION_INTERVAL_MS = 12000
const rotationProgress = ref(0)
const currentViewIndex = ref(0)

// Total views in rotation: [ 'leaderboard', 'last_game', ...games ]
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
  if (rotationTimer) clearInterval(rotationTimer)
  if (progressTimer) clearInterval(progressTimer)

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

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  pollingTimer = setInterval(syncLive, 6000)
  startAutoRotation()
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (pollingTimer) clearInterval(pollingTimer)
  if (rotationTimer) clearInterval(rotationTimer)
  if (progressTimer) clearInterval(progressTimer)
})
</script>

<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between p-4 lg:p-6 select-none overflow-hidden relative">
    
    <!-- Ambient Cyber Glows -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div class="absolute -top-32 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div class="absolute top-1/2 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-32 left-1/3 w-[32rem] h-96 bg-orange-600/10 rounded-full blur-3xl" />
    </div>

    <!-- ========================================================== -->
    <!-- TOP BROADCAST HEADER (10-Foot Big Screen Legible)          -->
    <!-- ========================================================== -->
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

      <!-- Right: View Status Progress & Digital Clock -->
      <div class="flex items-center gap-5">
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

    <!-- ========================================================== -->
    <!-- MAIN BROADCAST CONTENT (Smooth Rotation Between Views)     -->
    <!-- ========================================================== -->
    <main class="relative z-10 flex-1 my-3 overflow-hidden flex flex-col justify-center">

      <!-- ========================================================== -->
      <!-- VIEW 1: CLASSEMENT GÉNÉRAL CUMULÉ                         -->
      <!-- ========================================================== -->
      <div 
        v-if="activeViewType === 'leaderboard'" 
        class="w-full h-full flex flex-col justify-between gap-4 animate-fadeIn overflow-hidden"
      >
        <!-- Header Sub-bar -->
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

        <!-- Unified Single Column Leaderboard List (Consistent clean height and spacing) -->
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
            <!-- Left: Rank Badge & Player Info -->
            <div class="flex items-center gap-4 min-w-0">
              <!-- Rank Badge -->
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

              <!-- Avatar -->
              <img 
                :src="player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.participantName}`" 
                class="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0 shadow-inner object-cover"
              />

              <!-- Player Tag & Name -->
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

            <!-- Center: Scores per game pills -->
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

            <!-- Right: Massive Points Badge -->
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

      <!-- ========================================================== -->
      <!-- VIEW 2: DERNIER JEU RÉALISÉ (PODIUM & RÉSULTATS DU JEU)    -->
      <!-- ========================================================== -->
      <div 
        v-else-if="activeViewType === 'last_game'" 
        class="w-full h-full flex flex-col items-center justify-center animate-fadeIn px-4"
      >
        <div class="max-w-4xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 backdrop-blur-2xl shadow-2xl relative overflow-hidden text-center">
          
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <!-- Title Banner -->
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

          <!-- 3-Place Physical Podium for Last Game -->
          <div v-if="lastPlayedGameInfo?.top3 && lastPlayedGameInfo.top3.length > 0" class="flex items-end justify-center gap-6 lg:gap-10 my-4 h-56">
            
            <!-- Silver (2nd) -->
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

            <!-- Gold (1st Champion) -->
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

            <!-- Bronze (3rd) -->
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

          <!-- Fallback when no scores recorded yet -->
          <div v-else class="py-10 text-slate-500 font-mono text-sm">
            En attente de la première manche de cette épreuve...
          </div>

        </div>
      </div>

      <!-- ========================================================== -->
      <!-- VIEW 3: ROTATION PAR ÉPREUVE (SINGLE COLUMN + TOP HERO)   -->
      <!-- ========================================================== -->
      <div 
        v-else-if="activeGame" 
        class="w-full h-full flex flex-col justify-between gap-4 animate-fadeIn overflow-hidden"
      >
        <!-- PREMIER QUART D'ÉCRAN : HERO BANNER JEU + GRAND GAGNANT (~25% de l'écran) -->
        <div class="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 lg:p-5 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          
          <!-- Ambient Accent Glow -->
          <div class="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div class="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <!-- Left: Image liée & Nom du jeu -->
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
                  :class="activeGame.scoringType === 'WIN_LOSE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'"
                >
                  {{ activeGame.scoringType === 'WIN_LOSE' ? '⚔️ Victoire / Défaite' : '🏆 Scoreboard' }}
                </span>
                <span class="text-xs font-mono font-bold text-slate-400">
                  {{ activeGame.roundsCount > 0 ? `${activeGame.roundsCount} manche(s) disputée(s)` : 'En attente' }}
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

          <!-- Right: Grand Gagnant de l'épreuve (Top 1) -->
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

          <!-- Placeholder if no winner yet -->
          <div v-else class="px-5 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 shrink-0 z-10">
            En attente de la 1ère manche...
          </div>

        </div>

        <!-- CLASSEMENT DE L'ÉPREUVE EN UNE SEULE COLONNE (Single Column Full-Width Leaderboard) -->
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
            <!-- Left: Rank Badge & Player Info -->
            <div class="flex items-center gap-3 lg:gap-4 min-w-0">
              <!-- Rank -->
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

              <!-- Avatar -->
              <img 
                :src="p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.participantName}`" 
                class="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0 shadow-inner object-cover" 
              />

              <!-- Player Details -->
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

            <!-- Center: Round Details & Raw Score Breakdown -->
            <div class="hidden sm:flex items-center gap-3 font-mono">
              <!-- Round breakdown chips -->
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

            <!-- Right: Tournament Points Awarded -->
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

    <!-- ========================================================== -->
    <!-- BOTTOM BROADCAST TICKER                                    -->
    <!-- ========================================================== -->
    <footer class="relative z-10 w-full bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 backdrop-blur-md shadow-2xl shrink-0">
      
      <!-- Left: Ticker Badge -->
      <div class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 px-3.5 py-1.5 rounded-xl font-mono font-black text-slate-950 text-xs uppercase tracking-wider shrink-0 shadow">
        <Radio class="w-3.5 h-3.5 animate-pulse" />
        <span>INFO ARENA</span>
      </div>

      <!-- Center: Ticker Feed -->
      <div class="overflow-hidden relative flex-1 text-xs lg:text-sm font-mono font-semibold text-slate-300 h-6 flex items-center">
        <div class="inline-block whitespace-nowrap animate-ticker">
          🔥 <span class="text-amber-400 font-bold">DERNIÈRE MANCHE :</span> {{ lastPlayedGameInfo?.gameName || 'En cours' }} &bull; 
          🎮 <span class="text-cyan-400 font-bold">ÉPREUVES TOTALES :</span> {{ tournament?.totalGames || 0 }} jeux au programme &bull; 
          🏆 <span class="text-emerald-400 font-bold">LEADER ACTUEL :</span> {{ podium[0]?.participantName || '-' }} ({{ podium[0]?.totalPoints || 0 }} pts) &bull; 
          ⏱️ <span class="text-slate-400">SYNCHRONISATION LIVE CONTINUE</span>
        </div>
      </div>

      <!-- Right: Mobile Access Indicator -->
      <div class="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-4 shrink-0 text-right">
        <div class="text-[11px] font-mono font-bold text-slate-300 uppercase">Écran Spectateur</div>
        <span class="w-2 h-2 rounded-full bg-emerald-400" />
      </div>

    </footer>

  </div>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
