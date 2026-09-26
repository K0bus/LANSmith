<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  LayoutGrid,
  Users,
  Gamepad2,
  ShieldAlert,
  Sparkles,
  Filter,
  Plus,
  RefreshCw,
  Cpu,
  Monitor,
  Award,
  Trophy,
  ChevronDown,
  X
} from 'lucide-vue-next'
import CompatibilityBadge from '~/components/CompatibilityBadge.vue'
import HardwareBadge from '~/components/HardwareBadge.vue'
import ParticipantModal from '~/components/ParticipantModal.vue'
import GameModal from '~/components/GameModal.vue'

// Fetch matrix data
const { data: matrixData, pending, refresh } = await useFetch<any>('/api/compatibility/matrix')
const { data: tournaments, refresh: refreshTournaments } = await useFetch<any[]>('/api/tournaments')

const selectedTournamentId = ref<string>('')
const readinessFilter = ref<'all' | 'ready' | 'not_ready'>('all')
const searchQuery = ref('')
const isParticipantModalOpen = ref(false)
const isGameModalOpen = ref(false)

const selectedTournament = computed(() => {
  if (!selectedTournamentId.value || !tournaments.value) return null
  return tournaments.value.find((t: any) => t.id === selectedTournamentId.value) || null
})

const tournamentGameIds = computed(() => {
  if (!selectedTournament.value) return null
  const ids = new Set<string>()
  const t = selectedTournament.value
  if (t.tournamentGames && t.tournamentGames.length > 0) {
    t.tournamentGames.forEach((tg: any) => {
      if (tg.gameId) ids.add(tg.gameId)
      if (tg.game?.id) ids.add(tg.game.id)
    })
  } else if (t.games && t.games.length > 0) {
    t.games.forEach((g: any) => ids.add(g.id))
  }
  return ids
})

const gamesInTournamentScope = computed(() => {
  if (!matrixData.value?.games) return []
  if (tournamentGameIds.value !== null) {
    return matrixData.value.games.filter((g: any) => tournamentGameIds.value!.has(g.id))
  }
  return matrixData.value.games
})

const readyCount = computed(() => {
  return gamesInTournamentScope.value.filter(
    (g: any) => matrixData.value?.gameStats[g.id]?.is100PercentReady
  ).length
})

const notReadyCount = computed(() => {
  return gamesInTournamentScope.value.filter(
    (g: any) => !matrixData.value?.gameStats[g.id]?.is100PercentReady
  ).length
})

const filteredGames = computed(() => {
  let games = gamesInTournamentScope.value

  if (readinessFilter.value === 'ready') {
    games = games.filter((g: any) => matrixData.value?.gameStats[g.id]?.is100PercentReady)
  } else if (readinessFilter.value === 'not_ready') {
    games = games.filter((g: any) => !matrixData.value?.gameStats[g.id]?.is100PercentReady)
  }

  return games
})

function toggleReadiness(type: 'ready' | 'not_ready') {
  if (readinessFilter.value === type) {
    readinessFilter.value = 'all'
  } else {
    readinessFilter.value = type
  }
}

const filteredParticipants = computed(() => {
  if (!matrixData.value?.participants) return []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return matrixData.value.participants

  return matrixData.value.participants.filter((p: any) => {
    const nick = (p.nickname || p.name || '').toLowerCase()
    const gpu = (p.rig?.gpuName || p.rig?.gpuModel || '').toLowerCase()
    const cpu = (p.rig?.cpuName || p.rig?.cpuModel || '').toLowerCase()
    return nick.includes(q) || gpu.includes(q) || cpu.includes(q)
  })
})

function onDataSaved() {
  refresh()
  refreshTournaments()
}

function handleRefresh() {
  refresh()
  refreshTournaments()
}
</script>

<template>
  <div class="space-y-8">
    <!-- Hero / Header Section -->
    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-brand-950/40 border border-slate-800 p-6 md:p-8 shadow-2xl"
    >
      <div class="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-mono font-semibold mb-3"
          >
            <Sparkles class="w-3.5 h-3.5 text-brand-400" />
            <span>Moteur d'Audit Hardware LAN v2.0</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight">
            Matrice de Compatibilité du Parc de Machines
          </h1>
          <p class="text-sm text-slate-400 max-w-2xl mt-1">
            Vérification instantanée des configurations PC des participants par rapport aux exigences matérielles
            des jeux. Détectez immédiatement les goulots d'étranglement avant de lancer une épreuve.
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <button
            @click="isParticipantModalOpen = true"
            class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-lg"
          >
            <Plus class="w-4 h-4 text-brand-400" />
            <span>Ajouter Joueur & Rig</span>
          </button>

          <button
            @click="isGameModalOpen = true"
            class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-cyan transition-all cursor-pointer"
          >
            <Plus class="w-4 h-4 text-slate-950" />
            <span>Ajouter Jeu</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Controls bar -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Tournament Filter Select -->
        <div class="relative flex items-center">
          <div class="relative">
            <Trophy class="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              v-model="selectedTournamentId"
              class="pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-slate-900 border text-slate-300 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer transition-all shadow-sm max-w-[220px] sm:max-w-xs truncate"
              :class="
                selectedTournamentId
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                  : 'border-slate-800 hover:border-slate-700'
              "
            >
              <option value="" class="bg-slate-900 text-slate-300">Tous les tournois (Tous les jeux)</option>
              <option
                v-for="t in tournaments"
                :key="t.id"
                :value="t.id"
                class="bg-slate-900 text-white"
              >
                🏆 {{ t.name }} ({{ t.tournamentGames?.length || t.games?.length || 0 }} jeux)
              </option>
            </select>
            <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            v-if="selectedTournamentId"
            @click="selectedTournamentId = ''"
            class="ml-1.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Effacer le filtre tournoi"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- 100% Ready Filter -->
        <button
          @click="toggleReadiness('ready')"
          class="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer"
          :class="
            readinessFilter === 'ready'
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 shadow-glow-emerald'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          "
          title="Afficher uniquement les jeux où 100% des participants sont compatibles"
        >
          <Filter class="w-3.5 h-3.5" />
          <span>100% Proof</span>
          <span
            class="px-1.5 py-0.2 rounded text-[10px]"
            :class="readinessFilter === 'ready' ? 'bg-brand-500/40 text-brand-200' : 'bg-slate-800 text-slate-400'"
          >
            {{ readyCount }}
          </span>
        </button>

        <!-- Inverted Filter: Not 100% Proof (Bottlenecks/Issues) -->
        <button
          @click="toggleReadiness('not_ready')"
          class="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer"
          :class="
            readinessFilter === 'not_ready'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-glow-rose'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          "
          title="Afficher uniquement les jeux ayant des incompatibilités matérielles (<100% prêts)"
        >
          <ShieldAlert class="w-3.5 h-3.5" :class="readinessFilter === 'not_ready' ? 'text-rose-400' : 'text-slate-400'" />
          <span>Non 100% Proof</span>
          <span
            class="px-1.5 py-0.2 rounded text-[10px]"
            :class="readinessFilter === 'not_ready' ? 'bg-rose-500/40 text-rose-200' : 'bg-slate-800 text-slate-400'"
          >
            {{ notReadyCount }}
          </span>
        </button>

        <button
          @click="handleRefresh()"
          class="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          title="Actualiser la matrice"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': pending }" />
        </button>
      </div>

      <!-- Search participant -->
      <div class="relative w-full sm:w-72">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filtrer par joueur, GPU, CPU..."
          class="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 text-xs text-white placeholder-slate-500 font-mono"
        />
      </div>
    </div>

    <!-- The Cross Compatibility Dynamic Matrix Table -->
    <div class="cyber-card border-slate-800 overflow-hidden shadow-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-950 border-b border-slate-800 text-xs">
              <!-- Corner header : Participants -->
              <th class="p-4 sticky left-0 z-20 bg-slate-950 min-w-[260px] border-r border-slate-800">
                <div
                  class="font-bold text-white uppercase tracking-wider font-mono text-[11px] flex items-center justify-between"
                >
                  <span>Joueur & Configuration</span>
                  <span class="text-slate-500 text-[10px]">{{ filteredParticipants.length }} joueurs</span>
                </div>
              </th>

              <!-- Empty Game Column Header if 0 games match -->
              <th
                v-if="filteredGames.length === 0"
                class="p-6 text-center text-slate-500 text-xs font-mono italic"
              >
                Aucun jeu pour cette sélection
              </th>

              <!-- Game Column Headers -->
              <th
                v-for="game in filteredGames"
                :key="game.id"
                class="p-4 min-w-[180px] max-w-[220px] border-r border-slate-800/80 bg-slate-950/80"
              >
                <div class="flex items-start gap-2.5">
                  <img
                    :src="game.coverUrl || 'https://placehold.co/100x140/0f172a/38bdf8?text=Jeu'"
                    class="w-10 h-14 object-cover rounded-md bg-slate-800 shrink-0 border border-slate-700 shadow"
                    alt="cover"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-xs text-white truncate" :title="game.name">{{ game.name }}</div>

                    <!-- Stats badge for this game -->
                    <div class="mt-1.5 flex items-center gap-1.5">
                      <span
                        class="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold"
                        :class="
                          matrixData?.gameStats[game.id]?.is100PercentReady
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        "
                      >
                        {{ matrixData?.gameStats[game.id]?.percentReady }}% prêts
                      </span>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60 font-mono text-xs">
            <tr
              v-for="participant in filteredParticipants"
              :key="participant.id"
              class="hover:bg-slate-850/50 transition-colors"
            >
              <!-- Participant Info Cell (Sticky left) -->
              <td class="p-4 sticky left-0 z-10 bg-slate-900/95 backdrop-blur-md border-r border-slate-800">
                <div class="flex items-start gap-3">
                  <img
                    :src="
                      participant.avatarUrl ||
                      participant.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.nickname || participant.name}`
                    "
                    class="w-9 h-9 rounded-xl bg-slate-800 shrink-0 border border-slate-700"
                    alt="avatar"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="font-sans font-bold text-sm text-white truncate">
                      {{ participant.nickname || participant.name }}
                    </div>

                    <!-- Rig Quick specs -->
                    <div v-if="participant.rig" class="mt-1.5 flex flex-wrap gap-1">
                      <span
                        class="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-purple-300 truncate max-w-[160px]"
                        :title="participant.rig.gpuName || participant.rig.gpuModel"
                      >
                        {{ participant.rig.gpuName || participant.rig.gpuModel }}
                      </span>
                      <span
                        class="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-300"
                      >
                        {{ participant.rig.ramGb }}Go RAM
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Empty state when no games match -->
              <td
                v-if="filteredGames.length === 0"
                class="p-8 text-center text-slate-500 text-xs font-mono"
              >
                Aucun jeu sélectionné
              </td>

              <!-- Matrix Result Cells for each Game -->
              <td
                v-for="game in filteredGames"
                :key="game.id"
                class="p-4 border-r border-slate-800/60 text-center align-middle"
              >
                <CompatibilityBadge
                  :result="matrixData?.matrix[participant.id]?.[game.id]"
                  :showDetailsOnClick="true"
                />
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="filteredParticipants.length === 0">
              <td :colspan="Math.max(filteredGames.length, 1) + 1" class="p-12 text-center text-slate-500">
                Aucun participant ne correspond aux critères de recherche.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <ParticipantModal
      :isOpen="isParticipantModalOpen"
      @close="isParticipantModalOpen = false"
      @saved="onDataSaved"
    />

    <GameModal
      :isOpen="isGameModalOpen"
      @close="isGameModalOpen = false"
      @saved="onDataSaved"
    />
  </div>
</template>
