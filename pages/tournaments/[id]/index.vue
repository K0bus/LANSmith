<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy, Medal, Award, ArrowLeft, Plus, RefreshCw, Gamepad2, Users, Flame, Star, CheckCircle2, Swords, ListOrdered, Layers, Share2, Copy, Check, ExternalLink, Radio, X, Shuffle } from 'lucide-vue-next'
import ScoreEntryModal from '~/components/ScoreEntryModal.vue'
import RoundRobinModal from '~/components/RoundRobinModal.vue'

const route = useRoute()
const tournamentId = computed(() => route.params.id as string)

// Fetch leaderboard and tournament details
const { data: boardData, pending, refresh } = await useFetch<any>(() => `/api/tournaments/${tournamentId.value}/leaderboard`)
const { data: fullTournament, refresh: refreshFull } = await useFetch<any>(() => `/api/tournaments/${tournamentId.value}`)
const { data: participants } = await useFetch<any[]>('/api/participants')

const isScoreModalOpen = ref(false)
const isRoundRobinModalOpen = ref(false)
const selectedGameId = ref<string | undefined>(undefined)
const searchQuery = ref('')

// Share Modal
const isShareModalOpen = ref(false)
const shareCopied = ref(false)

const shareUrl = computed(() => {
  if (!process.client) return ''
  return `${window.location.origin}/tournaments/${tournamentId.value}/public`
})

function copyShareUrl() {
  if (!process.client || !shareUrl.value) return
  navigator.clipboard.writeText(shareUrl.value)
  shareCopied.value = true
  setTimeout(() => {
    shareCopied.value = false
  }, 2500)
}

const leaderboard = computed(() => {
  if (!boardData.value?.leaderboard) return []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return boardData.value.leaderboard

  return boardData.value.leaderboard.filter((entry: any) => {
    return entry.participantName.toLowerCase().includes(q) || entry.seatNumber?.toLowerCase().includes(q)
  })
})

const enrichedParticipants = computed(() => {
  const list = participants.value || []
  const lbMap = new Map((boardData.value?.leaderboard || []).map((entry: any) => [entry.participantId, entry]))

  return list.map((p: any) => {
    const entry: any = lbMap.get(p.id)
    return {
      ...p,
      globalRank: entry?.globalRank || 999,
      totalPoints: entry?.totalPoints || 0
    }
  })
})

const podium = computed(() => {
  return boardData.value?.podium || []
})

function openScoreModalForGame(gameId?: string) {
  selectedGameId.value = gameId
  
  // Detect if game is Round-Robin
  const game = boardData.value?.tournament?.games?.find((g: any) => g.id === gameId)
  if (game?.scoringType === 'ROUND_ROBIN') {
    isRoundRobinModalOpen.value = true
  } else {
    isScoreModalOpen.value = true
  }
}

function openRoundRobinModal(gameId?: string) {
  selectedGameId.value = gameId
  isRoundRobinModalOpen.value = true
}

function onScoresSaved() {
  refresh()
  refreshFull()
}
</script>

<template>
  <div class="space-y-8">
    <!-- Top back navigation & actions -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <NuxtLink 
          to="/tournaments" 
          class="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <ArrowLeft class="w-4 h-4" />
        </NuxtLink>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-black text-white tracking-tight">
              {{ boardData?.tournament?.name || 'Tournoi Multi-Jeux' }}
            </h1>
            <span 
              class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
              :class="{
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40': boardData?.tournament?.status === 'IN_PROGRESS',
                'bg-blue-500/20 text-blue-300 border border-blue-500/40': boardData?.tournament?.status === 'COMPLETED',
                'bg-slate-800 text-slate-400': boardData?.tournament?.status === 'DRAFT'
              }"
            >
              {{ boardData?.tournament?.status === 'IN_PROGRESS' ? 'En Direct' : (boardData?.tournament?.status === 'COMPLETED' ? 'Terminé' : 'Brouillon') }}
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Classement général cumulé en direct sur {{ boardData?.tournament?.totalGames }} épreuves ({{ boardData?.tournament?.totalRoundsPlayed || 0 }} manches disputées)
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        <button 
          v-if="boardData?.tournament?.games?.some((g: any) => g.scoringType === 'ROUND_ROBIN')"
          @click="openRoundRobinModal()" 
          class="px-3.5 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
        >
          <Shuffle class="w-4 h-4 text-cyan-400" />
          <span>Générateur Round-Robin</span>
        </button>

        <button 
          @click="isShareModalOpen = true" 
          class="px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-bold"
          title="Partager le lien spectateur en direct"
        >
          <Share2 class="w-4 h-4 text-cyan-400" />
          <span class="hidden sm:inline">Partager Live</span>
        </button>

        <button 
          @click="onScoresSaved()" 
          class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          title="Rafraîchir les scores"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': pending }" />
        </button>

        <button 
          @click="openScoreModalForGame()"
          class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4 text-slate-950" />
          <span>Gérer & Saisir une Manche</span>
        </button>
      </div>
    </div>

    <!-- Games Round Progress Bar -->
    <div class="cyber-card p-4 border-slate-800">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 text-xs font-mono">
        <div class="flex items-center gap-2">
          <Layers class="w-4 h-4 text-amber-400" />
          <span class="text-slate-300 uppercase font-bold">Épreuves au programme & Manches :</span>
        </div>
        <span class="text-amber-400 font-bold">
          Progression : {{ boardData?.tournament?.completedGames }} / {{ boardData?.tournament?.totalGames }} jeux lancés ({{ boardData?.tournament?.progressPercent }}%)
        </span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div 
          v-for="(g, idx) in boardData?.tournament?.games" 
          :key="g.id"
          @click="openScoreModalForGame(g.id)"
          class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/60 flex items-center gap-3 cursor-pointer transition-all group relative overflow-hidden"
        >
          <div class="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
            #{{ idx + 1 }}
          </div>
          <img :src="g.coverUrl || 'https://placehold.co/40x55'" class="w-9 h-12 object-cover rounded bg-slate-800 shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
              {{ g.name }}
            </div>
            <div class="flex items-center gap-1.5 mt-1">
              <span 
                class="text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold"
                :class="{
                  'bg-rose-950 text-rose-300 border border-rose-800/60': g.scoringType === 'WIN_LOSE',
                  'bg-cyan-950 text-cyan-300 border border-cyan-800/60': g.scoringType === 'ROUND_ROBIN',
                  'bg-amber-950 text-amber-300 border border-amber-800/60': g.scoringType !== 'WIN_LOSE' && g.scoringType !== 'ROUND_ROBIN'
                }"
              >
                {{ g.scoringType === 'WIN_LOSE' ? 'Victoire/Défaite' : (g.scoringType === 'ROUND_ROBIN' ? 'Round-Robin' : 'Scoreboard') }}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">
                {{ g.scoringType === 'ROUND_ROBIN' ? (g.completedMatches > 0 ? `${g.completedMatches}/${g.totalMatches} matchs` : `${g.totalMatches || 0} matchs`) : (g.roundsCount > 0 ? `${g.roundsCount} manche${g.roundsCount > 1 ? 's' : ''}` : '0 manche') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PODIUM (Top 3) -->
    <div v-if="podium.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
      <!-- 2nd Place (Silver) -->
      <div v-if="podium[1]" class="cyber-card p-6 border-slate-700/80 bg-gradient-to-b from-slate-800/40 to-slate-900 text-center flex flex-col items-center justify-between order-2 md:order-1 relative overflow-hidden">
        <div class="absolute top-0 inset-x-0 h-1 bg-slate-400" />
        <div class="w-12 h-12 rounded-full bg-slate-700/80 border border-slate-400 text-slate-200 flex items-center justify-center font-black text-xl mb-3 shadow">
          2
        </div>
        <img :src="podium[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[1].participantName}`" class="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-slate-400 shadow-lg mb-3" />
        <div>
          <h3 class="font-bold text-lg text-white">{{ podium[1].participantName }}</h3>
          <p class="text-xs text-slate-400 font-mono">{{ podium[1].seatNumber || 'Place LAN' }}</p>
        </div>
        <div class="mt-4 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-600 text-slate-200 font-mono font-black text-lg">
          {{ podium[1].totalPoints }} pts
        </div>
      </div>

      <!-- 1st Place (Gold / Champion) -->
      <div v-if="podium[0]" class="cyber-card p-6 border-amber-500/60 bg-gradient-to-b from-amber-950/30 to-slate-900 text-center flex flex-col items-center justify-between order-1 md:order-2 shadow-[0_0_30px_rgba(245,158,11,0.25)] relative overflow-hidden transform md:-translate-y-3">
        <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_15px_#f59e0b]" />
        <div class="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center font-black text-2xl mb-3 shadow-glow-amber">
          👑 1
        </div>
        <img :src="podium[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[0].participantName}`" class="w-20 h-20 rounded-2xl bg-slate-950 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-3" />
        <div>
          <h3 class="font-extrabold text-xl text-amber-300 drop-shadow">{{ podium[0].participantName }}</h3>
          <p class="text-xs text-amber-400/80 font-mono">{{ podium[0].seatNumber || 'Place LAN' }}</p>
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
        <img :src="podium[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${podium[2].participantName}`" class="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-700 shadow-lg mb-3" />
        <div>
          <h3 class="font-bold text-lg text-white">{{ podium[2].participantName }}</h3>
          <p class="text-xs text-slate-400 font-mono">{{ podium[2].seatNumber || 'Place LAN' }}</p>
        </div>
        <div class="mt-4 px-4 py-1.5 rounded-full bg-slate-800 border border-amber-900 text-amber-400 font-mono font-black text-lg">
          {{ podium[2].totalPoints }} pts
        </div>
      </div>
    </div>

    <!-- Leaderboard Table -->
    <div class="cyber-card border-slate-800 overflow-hidden shadow-2xl">
      <div class="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 class="font-bold text-base text-white flex items-center gap-2">
            <Trophy class="w-4 h-4 text-amber-400" />
            <span>Tableau du Classement Général en Direct</span>
          </h2>
          <p class="text-[11px] text-slate-400 mt-0.5">Cumul automatique des points de toutes les manches disputées</p>
        </div>

        <div class="relative w-full sm:w-64">
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Filtrer un joueur..."
            class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs text-white placeholder-slate-500"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr class="bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
              <th class="p-4 w-16 text-center">Rang</th>
              <th class="p-4 min-w-[200px] font-sans">Joueur</th>
              <!-- Dynamic Game Columns -->
              <th 
                v-for="g in boardData?.tournament?.games" 
                :key="g.id"
                class="p-4 text-center min-w-[140px] cursor-pointer hover:bg-slate-900/60 transition-colors"
                @click="openScoreModalForGame(g.id)"
                :title="`Gérer les scores de ${g.name}`"
              >
                <div class="flex flex-col items-center gap-0.5">
                  <span class="truncate max-w-[130px] font-bold text-white" :title="g.name">{{ g.name }}</span>
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
                      {{ g.scoringType === 'ROUND_ROBIN' ? `(${g.completedMatches || 0}/${g.totalMatches || 0} m.)` : `(${g.roundsCount} m.)` }}
                    </span>
                  </div>
                </div>
              </th>
              <th class="p-4 text-right min-w-[120px] font-bold text-amber-400">Total Points</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60">
            <tr 
              v-for="entry in leaderboard" 
              :key="entry.participantId"
              class="hover:bg-slate-855/50 transition-colors"
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

              <!-- Participant Name & Seat -->
              <td class="p-4 font-sans">
                <div class="flex items-center gap-3">
                  <img :src="entry.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.participantName}`" class="w-8 h-8 rounded-full bg-slate-800" />
                  <div>
                    <div class="font-bold text-sm text-white">{{ entry.participantName }}</div>
                    <div class="text-[11px] text-slate-400 font-mono">{{ entry.seatNumber || 'Place LAN' }}</div>
                  </div>
                </div>
              </td>

              <!-- Scores per game (Tournament points from final game rank + round breakdown) -->
              <td 
                v-for="g in boardData?.tournament?.games" 
                :key="g.id"
                class="p-4 text-center cursor-pointer hover:bg-slate-900/40 transition-colors"
                @click="openScoreModalForGame(g.id)"
              >
                <div v-if="entry.gameScores[g.id]" class="space-y-1">
                  <!-- Tournament Points & Game Rank -->
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

                  <!-- Raw round sum & round details breakdown / RR breakdown -->
                  <div class="text-[10px] text-slate-400 font-mono">
                    <template v-if="entry.gameScores[g.id].scoringType === 'ROUND_ROBIN' && entry.gameScores[g.id].roundRobinStats">
                      <span class="text-amber-400 font-bold">{{ entry.gameScores[g.id].roundRobinStats.rrPoints }} pts RR</span>
                      <span class="text-slate-500 ml-1">({{ entry.gameScores[g.id].roundRobinStats.wins }}V-{{ entry.gameScores[g.id].roundRobinStats.draws }}N-{{ entry.gameScores[g.id].roundRobinStats.losses }}D)</span>
                    </template>
                    <template v-else>
                      <span class="text-slate-500 font-semibold">{{ entry.gameScores[g.id].rawRoundPoints }} pts m.</span>
                      <span v-if="entry.gameScores[g.id].roundDetails?.length > 1" class="text-slate-600 ml-1">
                        ({{ entry.gameScores[g.id].roundDetails.map(rd => `M${rd.roundNumber}:${rd.points}`).join(' · ') }})
                      </span>
                    </template>
                  </div>
                </div>
                <span v-else class="text-slate-700">-</span>
              </td>

              <!-- Cumulative Total Points -->
              <td class="p-4 text-right">
                <span class="text-base font-black text-amber-400">
                  {{ entry.totalPoints }}
                </span>
                <span class="text-[11px] text-slate-500 ml-1">pts</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Score Entry Modal (Scoreboard & Win/Loss) -->
    <ScoreEntryModal
      :isOpen="isScoreModalOpen"
      :tournament="fullTournament"
      :selectedGameId="selectedGameId"
      :participants="enrichedParticipants"
      @close="isScoreModalOpen = false"
      @saved="onScoresSaved"
      @openRoundRobin="(gId) => { isScoreModalOpen = false; openRoundRobinModal(gId) }"
    />

    <!-- Round Robin Modal (Tournament Matches Generator & Manager) -->
    <RoundRobinModal
      :isOpen="isRoundRobinModalOpen"
      :tournament="fullTournament"
      :selectedGameId="selectedGameId"
      :participants="enrichedParticipants"
      @close="isRoundRobinModalOpen = false"
      @saved="onScoresSaved"
    />

    <!-- Share Tournament Public Modal -->
    <Teleport to="body">
      <div 
        v-if="isShareModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="isShareModalOpen = false"
      >
        <div class="cyber-card p-6 border-slate-700 bg-slate-900/95 max-w-lg w-full space-y-6 shadow-2xl relative">
          
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Share2 class="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Partager le Tournoi en Direct</h3>
                <p class="text-xs text-slate-400 font-mono">{{ boardData?.tournament?.name }}</p>
              </div>
            </div>

            <button 
              @click="isShareModalOpen = false"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Feature Description -->
          <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div class="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <Radio class="w-3.5 h-3.5 animate-pulse" />
              <span>Vue Spectateur & Diffusion (Lecture Seule)</span>
            </div>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              Ce lien donne un accès direct en lecture seule (sans possibilité de saisie ni de modification) permettant à tous les participants et spectateurs de suivre :
            </p>
            <ul class="list-disc list-inside text-[11px] text-slate-400 space-y-1 font-mono">
              <li>Le classement général et le podium en direct</li>
              <li>La rotation automatique des classements par jeu</li>
              <li>Le flux en temps réel des derniers scores enregistrés</li>
            </ul>
          </div>

          <!-- Share Link Box -->
          <div class="space-y-2">
            <label class="block text-xs font-mono font-bold text-slate-300 uppercase">
              Lien public partageable :
            </label>
            <div class="flex items-center gap-2">
              <input 
                :value="shareUrl" 
                readonly
                class="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono outline-none select-all"
              />
              <button
                @click="copyShareUrl"
                class="px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer shrink-0"
                :class="shareCopied ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'"
              >
                <Check v-if="shareCopied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ shareCopied ? 'Copié !' : 'Copier' }}</span>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              @click="isShareModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Fermer
            </button>

            <NuxtLink
              :to="`/tournaments/${tournamentId}/public`"
              target="_blank"
              class="px-4 py-2 text-xs font-bold font-mono rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 flex items-center gap-2 transition-all"
            >
              <span>Ouvrir la vue Live</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>
