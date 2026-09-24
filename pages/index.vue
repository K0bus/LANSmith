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
  Award
} from 'lucide-vue-next'
import CompatibilityBadge from '~/components/CompatibilityBadge.vue'
import HardwareBadge from '~/components/HardwareBadge.vue'
import ParticipantModal from '~/components/ParticipantModal.vue'
import GameModal from '~/components/GameModal.vue'

// Fetch matrix data
const { data: matrixData, pending, refresh } = await useFetch<any>('/api/compatibility/matrix')

const showLanReadyOnly = ref(false)
const searchQuery = ref('')
const isParticipantModalOpen = ref(false)
const isGameModalOpen = ref(false)

const filteredGames = computed(() => {
  if (!matrixData.value?.games) return []
  if (!showLanReadyOnly.value) return matrixData.value.games

  return matrixData.value.games.filter((g: any) => {
    return matrixData.value.gameStats[g.id]?.is100PercentReady
  })
})

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
      <div class="flex items-center gap-3">
        <button
          @click="showLanReadyOnly = !showLanReadyOnly"
          class="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer"
          :class="
            showLanReadyOnly
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/50 shadow-glow-emerald'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          "
        >
          <Filter class="w-3.5 h-3.5" />
          <span>100% LAN Ready Uniquement</span>
          <span
            v-if="matrixData?.summary?.lanReadyCount"
            class="px-1.5 py-0.2 rounded bg-brand-500/30 text-brand-300 text-[10px]"
          >
            {{ matrixData.summary.lanReadyCount }}
          </span>
        </button>

        <button
          @click="refresh()"
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
              <td :colspan="(filteredGames.length || 1) + 1" class="p-12 text-center text-slate-500">
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
