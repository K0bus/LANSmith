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
  Layers,
  Coins,
  Tag,
  Share2,
  Download,
  ExternalLink,
  RefreshCw,
  Info,
  Store,
  Users,
  CheckCircle2,
  DollarSign
} from 'lucide-vue-next'
import GameModal from '~/components/GameModal.vue'
import { getEffectivePrice, formatCentsToPrice } from '~/shared/utils/pricing'

const { data: games, pending, refresh } = await useFetch<any[]>('/api/games')

const isModalOpen = ref(false)
const selectedGame = ref<any>(null)
const searchQuery = ref('')
const acquisitionFilter = ref<'ALL' | 'FREE' | 'PAID'>('ALL')

const refreshingPrices = ref<Record<string, boolean>>({})

const filteredGames = computed(() => {
  if (!games.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  
  return games.value.filter((g: any) => {
    const matchesSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.summary?.toLowerCase().includes(q) ||
      g.genres?.toLowerCase().includes(q)

    if (!matchesSearch) return false

    const eff = getEffectivePrice(g)
    if (acquisitionFilter.value === 'FREE') {
      return eff.is_free
    }
    if (acquisitionFilter.value === 'PAID') {
      return !eff.is_free
    }

    return true
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

async function refreshSingleGamePrices(gameId: string) {
  refreshingPrices.value[gameId] = true
  try {
    await $fetch(`/api/games/${gameId}/refresh-prices`, {
      method: 'POST',
      body: { force: true }
    })
    await refresh()
  } catch (err) {
    console.error('Error refreshing prices:', err)
  } finally {
    refreshingPrices.value[gameId] = false
  }
}

function formatRelativeTime(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Jamais'
  const date = new Date(dateStr)
  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Récemment'
  if (diffHours < 24) return `Il y a ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `Il y a ${diffDays}j`
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
          <Gamepad2 class="w-6 h-6 text-cyan-400" />
          <span>Catalogue de Jeux, Tarification & Exigences</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Suivi des prix dynamiques (Steam & Marché gris), acquisition groupe/partage et profils de benchmark PassMark
        </p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-cyan transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-slate-950" />
        <span>Importer / Ajouter un Jeu</span>
      </button>
    </div>

    <!-- Search bar & Acquisition Filters -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher un jeu (nom, genre, description)..."
          class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 font-mono"
        />
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-2">
        <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            @click="acquisitionFilter = 'ALL'"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            :class="acquisitionFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            Tous ({{ games?.length || 0 }})
          </button>
          <button
            @click="acquisitionFilter = 'FREE'"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="acquisitionFilter === 'FREE' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
            <span>Gratuits / F2P & Partage</span>
          </button>
          <button
            @click="acquisitionFilter = 'PAID'"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="acquisitionFilter === 'PAID' ? 'bg-blue-950/80 text-blue-300 border border-blue-800 font-bold' : 'text-slate-400 hover:text-slate-200'"
          >
            <Store class="w-3.5 h-3.5 text-blue-400" />
            <span>Payants / Clés</span>
          </button>
        </div>

        <div class="text-xs font-mono text-slate-400 hidden sm:block">
          {{ filteredGames.length }} jeu(x)
        </div>
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
          <div class="relative h-48 bg-slate-950 overflow-hidden">
            <img
              :src="game.coverUrl || 'https://placehold.co/400x200/0f172a/38bdf8?text=Jeu+LAN'"
              class="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-300"
              alt="cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

            <!-- Price Tag Badge Top-Left -->
            <div class="absolute top-3 left-3 flex flex-col items-start gap-1">
              <!-- Free to play -->
              <span
                v-if="game.acquisitionType === 'FREE_TO_PLAY'"
                class="px-2.5 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/80 text-emerald-300 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                <span>Gratuit (Free-to-Play)</span>
              </span>

              <!-- Friend Share -->
              <span
                v-else-if="game.acquisitionType === 'FRIEND_SHARE'"
                class="px-2.5 py-1 rounded-lg bg-purple-950/90 backdrop-blur-md border border-purple-500/80 text-purple-200 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Users class="w-3.5 h-3.5 text-purple-400" />
                <span>Gratuit (Partage entre amis)</span>
              </span>

              <!-- Store Buy - Lowest Price Tag -->
              <div
                v-else
                class="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-cyan-500/60 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg"
              >
                <Tag class="w-3.5 h-3.5 text-cyan-400" />
                <span class="text-cyan-300 font-extrabold">{{ getEffectivePrice(game).display_price }}</span>
                <span class="text-[10px] text-slate-300 font-normal">({{ getEffectivePrice(game).source_label }})</span>
              </div>
            </div>

            <!-- Action buttons Top-Right -->
            <div class="absolute top-3 right-3 flex items-center gap-1">
              <button
                @click="refreshSingleGamePrices(game.id)"
                :disabled="refreshingPrices[game.id]"
                class="p-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                title="Actualiser les tarifs Steam & Clés"
              >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshingPrices[game.id] }" />
              </button>
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

            <!-- Title & Metadata Bottom -->
            <div class="absolute bottom-3 left-4 right-4">
              <h3 class="font-bold text-lg text-white leading-tight drop-shadow truncate">
                {{ game.name }}
              </h3>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="game.genres" class="text-[10px] text-cyan-400/90 font-mono truncate">
                  {{ game.genres }}
                </span>
                <span v-if="game.steamAppId" class="text-[10px] text-blue-300 font-mono">
                  Steam #{{ game.steamAppId }}
                </span>
              </div>
            </div>
          </div>

          <!-- Description & Content Section -->
          <div class="p-5 space-y-4">
            <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {{ game.summary || 'Aucun résumé disponible pour ce jeu.' }}
            </p>

            <!-- Pricing Comparison / Friend Share Box -->
            <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-[11px] font-mono">
                <span class="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Coins class="w-3.5 h-3.5 text-cyan-400" />
                  <span>Acquisition & Tarifs :</span>
                </span>
                <span class="text-[10px] text-slate-500">
                  Synchro : {{ formatRelativeTime(game.priceUpdatedAt) }}
                </span>
              </div>

              <!-- Cas 1: Partage entre amis avec lien -->
              <div v-if="game.acquisitionType === 'FRIEND_SHARE'" class="space-y-2">
                <div class="flex items-center justify-between p-2 rounded-lg bg-purple-950/30 border border-purple-800/60 text-xs">
                  <span class="text-purple-300 font-bold flex items-center gap-1.5">
                    <Users class="w-3.5 h-3.5 text-purple-400" />
                    <span>Partage LAN / Réseau</span>
                  </span>
                  <span class="text-emerald-400 font-mono font-bold">0,00 €</span>
                </div>
                
                <a
                  v-if="game.friendDownloadUrl"
                  :href="game.friendDownloadUrl.startsWith('http') ? game.friendDownloadUrl : undefined"
                  :target="game.friendDownloadUrl.startsWith('http') ? '_blank' : undefined"
                  class="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold transition-all"
                  :title="game.friendDownloadUrl"
                >
                  <span class="flex items-center gap-1.5 truncate mr-2">
                    <Download class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span class="truncate">{{ game.friendDownloadUrl }}</span>
                  </span>
                  <ExternalLink class="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>

              <!-- Cas 2: Free to Play -->
              <div v-else-if="game.acquisitionType === 'FREE_TO_PLAY'" class="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs">
                <span class="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Free-to-Play officiel</span>
                </span>
                <span class="text-emerald-400 font-mono font-bold">0,00 €</span>
              </div>

              <!-- Cas 3: Store / Clés avec Comparateur Steam vs Marché Gris -->
              <div v-else class="space-y-1.5">
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <!-- Steam Official -->
                  <div
                    class="p-2 rounded-lg border flex flex-col justify-between"
                    :class="
                      getEffectivePrice(game).source === 'STEAM'
                        ? 'bg-blue-950/40 border-blue-500/80 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    "
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-blue-300 flex items-center gap-1">
                        <Store class="w-3 h-3" />
                        <span>Steam</span>
                      </span>
                      <span v-if="getEffectivePrice(game).source === 'STEAM'" class="text-[9px] text-cyan-400 uppercase font-bold">Choisi</span>
                    </div>
                    <div class="text-sm font-bold text-white mt-1">
                      {{ formatCentsToPrice(game.steamPriceCents, game.currency) }}
                    </div>
                  </div>

                  <!-- Keyshop / Gray Market -->
                  <div
                    class="p-2 rounded-lg border flex flex-col justify-between"
                    :class="
                      getEffectivePrice(game).source === 'KEYSHOP'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    "
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-purple-300 flex items-center gap-1">
                        <Tag class="w-3 h-3" />
                        <span>Clé Revendeur</span>
                      </span>
                      <span v-if="getEffectivePrice(game).source === 'KEYSHOP'" class="text-[9px] text-emerald-400 uppercase font-bold">Meilleur</span>
                    </div>
                    <div class="text-sm font-bold text-emerald-400 mt-1">
                      {{ formatCentsToPrice(game.keyshopPriceCents, game.currency) }}
                    </div>
                  </div>
                </div>

                <!-- Tooltip / Économie si applicable -->
                <div
                  v-if="getEffectivePrice(game).savings_cents && getEffectivePrice(game).savings_cents! > 0"
                  class="p-1.5 rounded bg-emerald-950/30 border border-emerald-900/50 text-[10px] font-mono text-emerald-300 flex items-center justify-between"
                >
                  <span>💸 Économie marché gris :</span>
                  <span class="font-bold">
                    -{{ formatCentsToPrice(getEffectivePrice(game).savings_cents) }} ({{ getEffectivePrice(game).savings_percent }}%)
                  </span>
                </div>
              </div>
            </div>

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
