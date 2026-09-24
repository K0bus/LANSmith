<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Gamepad2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  Cpu,
  Monitor,
  HardDrive,
  Layers
} from 'lucide-vue-next'
import GameModal from '~/components/GameModal.vue'

const { data: games, pending, refresh } = await useFetch<any[]>('/api/games')

const isModalOpen = ref(false)
const selectedGame = ref<any>(null)
const searchQuery = ref('')

const filteredGames = computed(() => {
  if (!games.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return games.value

  return games.value.filter((g: any) => {
    return (
      g.name.toLowerCase().includes(q) ||
      g.summary?.toLowerCase().includes(q)
    )
  })
})

function openAddModal() {
  selectedGame.value = null
  isModalOpen.value = true
}

function openEditModal(g: any) {
  selectedGame.value = g
  isModalOpen.value = true
}

async function deleteGame(id: string, name: string) {
  if (!confirm(`Supprimer le jeu "${name}" du catalogue ?`)) return

  try {
    await $fetch(`/api/games/${id}`, { method: 'DELETE' })
    refresh()
  } catch (err) {
    alert('Erreur lors de la suppression.')
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
          <Gamepad2 class="w-6 h-6 text-cyan-400" />
          <span>Catalogue de Jeux & Exigences Matérielles</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Jeux disponibles pour les tournois avec scoring PassMark minimal et recommandé
        </p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-cyan transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-slate-950" />
        <span>Importer via IGDB / Matching</span>
      </button>
    </div>

    <!-- Search bar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un jeu dans le catalogue..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 font-mono"
        />
      </div>

      <div class="text-xs font-mono text-slate-400">
        {{ filteredGames.length }} jeu(x) au catalogue
      </div>
    </div>

    <!-- Games Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="game in filteredGames"
        :key="game.id"
        class="cyber-card overflow-hidden border-slate-800 hover:border-slate-700 flex flex-col justify-between group transition-all"
      >
        <div>
          <!-- Banner & Cover header -->
          <div class="relative h-44 bg-slate-950 overflow-hidden">
            <img
              :src="game.coverUrl || 'https://placehold.co/400x200/0f172a/38bdf8?text=Jeu+LAN'"
              class="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-300"
              alt="cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

            <div class="absolute top-3 right-3 flex items-center gap-1">
              <button
                @click="openEditModal(game)"
                class="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer"
                title="Modifier"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteGame(game.id, game.name)"
                class="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                title="Supprimer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <div class="absolute bottom-3 left-4 right-4">
              <h3 class="font-bold text-lg text-white leading-tight drop-shadow truncate">
                {{ game.name }}
              </h3>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="game.igdbId" class="text-[10px] text-purple-300 font-mono">
                  IGDB #{{ game.igdbId }}
                </span>
                <span class="text-[10px] text-slate-400 font-mono truncate">
                  /{{ game.slug }}
                </span>
              </div>
            </div>
          </div>

          <!-- Description & Specs Section -->
          <div class="p-5 space-y-4">
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {{ game.summary || 'Aucun résumé disponible pour ce jeu.' }}
            </p>

            <!-- Minimum Specs Box -->
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div class="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Spécifications Minimales :</span>
                <span class="text-[10px] text-slate-500 font-normal">Plancher 720p/1080p</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <!-- GPU Score -->
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min GPU</span>
                  <span class="text-purple-300 font-bold">{{ game.minGpuScore }} pts</span>
                </div>

                <!-- CPU Score -->
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min CPU</span>
                  <span class="text-cyan-300 font-bold">{{ game.minCpuScore }} pts</span>
                </div>

                <!-- RAM -->
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min RAM</span>
                  <span class="text-emerald-400 font-bold">{{ game.minRamGb }} Go</span>
                </div>

                <!-- VRAM -->
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min VRAM</span>
                  <span class="text-purple-400 font-bold">{{ game.minVramGb }} Go</span>
                </div>
              </div>
            </div>

            <!-- Recommended Specs Box -->
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div class="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Spécifications Recommandées :</span>
                <span class="text-[10px] text-slate-500 font-normal">Confort 1080p/1440p</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Rec GPU</span>
                  <span class="text-purple-300 font-bold">{{ game.recGpuScore }} pts</span>
                </div>

                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Rec CPU</span>
                  <span class="text-cyan-300 font-bold">{{ game.recCpuScore }} pts</span>
                </div>

                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Rec RAM</span>
                  <span class="text-emerald-400 font-bold">{{ game.recRamGb }} Go</span>
                </div>

                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Rec VRAM</span>
                  <span class="text-purple-400 font-bold">{{ game.recVramGb }} Go</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-5 pt-0">
          <NuxtLink
            to="/"
            class="block w-full text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono transition-all"
          >
            Tester l'éligibilité sur le parc →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Game Modal -->
    <GameModal
      :isOpen="isModalOpen"
      :gameToEdit="selectedGame"
      @close="isModalOpen = false"
      @saved="refresh"
    />
  </div>
</template>
