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
  DollarSign,
  Trophy,
  ChevronDown,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  TrendingDown,
  Zap,
  Activity,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-vue-next'
import GameModal from '~/components/GameModal.vue'
import { getEffectivePrice, formatCentsToPrice } from '~/shared/utils/pricing'

const { data: games, pending, refresh } = await useFetch<any[]>('/api/games')
const { data: tournaments } = await useFetch<any[]>('/api/tournaments')
const { data: matrixData, refresh: refreshMatrix } = await useFetch<any>('/api/compatibility/matrix')

const isModalOpen = ref(false)
const selectedGame = ref<any>(null)
const searchQuery = ref('')
const acquisitionFilter = ref<'ALL' | 'FREE' | 'PAID'>('ALL')
const selectedTournamentId = ref<string>('')
const viewMode = ref<'grid' | 'table'>('grid')

// Sorting state: name, price, compatibility
const sortBy = ref<'name' | 'price' | 'compatibility'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

function toggleSort(field: 'name' | 'price' | 'compatibility') {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = field === 'name' || field === 'price' ? 'asc' : 'desc'
  }
}

const refreshingPrices = ref<Record<string, boolean>>({})

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

const filteredGames = computed(() => {
  if (!games.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  
  const filtered = games.value.filter((g: any) => {
    // 1. Tournament filter
    if (tournamentGameIds.value !== null && !tournamentGameIds.value.has(g.id)) {
      return false
    }

    // 2. Search query filter
    const matchesSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.summary?.toLowerCase().includes(q) ||
      g.genres?.toLowerCase().includes(q)

    if (!matchesSearch) return false

    // 3. Acquisition filter
    const eff = getEffectivePrice(g)
    if (acquisitionFilter.value === 'FREE') {
      return eff.is_free
    }
    if (acquisitionFilter.value === 'PAID') {
      return !eff.is_free
    }

    return true
  })

  // 4. Sorting logic
  return filtered.slice().sort((a: any, b: any) => {
    let diff = 0
    if (sortBy.value === 'name') {
      diff = a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    } else if (sortBy.value === 'price') {
      const priceA = getEffectivePrice(a).raw_cents ?? (getEffectivePrice(a).is_free ? 0 : 9999999)
      const priceB = getEffectivePrice(b).raw_cents ?? (getEffectivePrice(b).is_free ? 0 : 9999999)
      diff = priceA - priceB
    } else if (sortBy.value === 'compatibility') {
      const readyA = matrixData.value?.gameStats?.[a.id]?.percentReady ?? 0
      const readyB = matrixData.value?.gameStats?.[b.id]?.percentReady ?? 0
      diff = readyA - readyB
    }

    return sortOrder.value === 'asc' ? diff : -diff
  })
})

// Summary / KPI metrics based on filtered games
const summaryStats = computed(() => {
  const list = filteredGames.value
  const totalGames = list.length
  if (totalGames === 0) {
    return {
      totalGames: 0,
      freeGamesCount: 0,
      paidGamesCount: 0,
      totalEstimatedCents: 0,
      totalSteamFullCents: 0,
      totalSavingsCents: 0,
      avgPercentReady: 0,
      ready100Count: 0
    }
  }

  let freeGamesCount = 0
  let paidGamesCount = 0
  let totalEstimatedCents = 0
  let totalSteamFullCents = 0
  let sumPercentReady = 0
  let ready100Count = 0

  for (const g of list) {
    const eff = getEffectivePrice(g)
    if (eff.is_free) {
      freeGamesCount++
    } else {
      paidGamesCount++
      totalEstimatedCents += eff.raw_cents || 0
      totalSteamFullCents += g.steamPriceCents || eff.raw_cents || 0
    }

    const stats = matrixData.value?.gameStats?.[g.id]
    if (stats) {
      sumPercentReady += stats.percentReady || 0
      if (stats.is100PercentReady) ready100Count++
    }
  }

  const totalSavingsCents = Math.max(0, totalSteamFullCents - totalEstimatedCents)

  return {
    totalGames,
    freeGamesCount,
    paidGamesCount,
    totalEstimatedCents,
    totalSteamFullCents,
    totalSavingsCents,
    avgPercentReady: Math.round(sumPercentReady / totalGames),
    ready100Count
  }
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
    await Promise.all([refresh(), refreshMatrix()])
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
    await Promise.all([refresh(), refreshMatrix()])
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
          <span>Catalogue de Jeux & Tarification</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Suivi des prix dynamiques (Steam & Marché gris), acquisition groupe/partage et compatibilité du parc
        </p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-cyan transition-all cursor-pointer shrink-0"
      >
        <Plus class="w-4 h-4 text-slate-950" />
        <span>Importer / Ajouter un Jeu</span>
      </button>
    </div>

    <!-- SUMMARY / KPI BANNER (TOP RÉCAPITULATIF) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 1. Volume & Mix Jeux -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
          <Gamepad2 class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Jeux Sélectionnés
          </div>
          <div class="text-2xl font-black text-white font-mono mt-0.5">
            {{ summaryStats.totalGames }} <span class="text-xs text-slate-400 font-normal">titre(s)</span>
          </div>
          <div class="text-[10px] font-mono text-cyan-300 mt-0.5 truncate">
            {{ summaryStats.freeGamesCount }} gratuit(s) • {{ summaryStats.paidGamesCount }} payant(s)
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/15 transition-all pointer-events-none" />
      </div>

      <!-- 2. Budget / Coût Total Estimé du Lot -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
          <Coins class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Tarif Estimé du Lot
          </div>
          <div class="text-2xl font-black text-emerald-400 font-mono mt-0.5">
            {{ formatCentsToPrice(summaryStats.totalEstimatedCents) }}
          </div>
          <div class="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
            <span v-if="summaryStats.totalSavingsCents > 0" class="text-emerald-300 font-semibold flex items-center gap-0.5">
              <TrendingDown class="w-3 h-3" />
              <span>-{{ formatCentsToPrice(summaryStats.totalSavingsCents) }} d'économie</span>
            </span>
            <span v-else>Tarif optimisé avec F2P & Partages</span>
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/15 transition-all pointer-events-none" />
      </div>

      <!-- 3. Compatibilité Moyenne Parc -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
          <Activity class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Compatibilité Parc</span>
            <span class="text-[9px] text-purple-400">Moyenne</span>
          </div>
          <div class="text-2xl font-black text-purple-300 font-mono mt-0.5">
            {{ summaryStats.avgPercentReady }}% <span class="text-xs text-slate-400 font-normal">prêts</span>
          </div>
          <div class="text-[10px] font-mono text-purple-300/80 mt-0.5 truncate">
            Sur l'ensemble des joueurs inscrits
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all pointer-events-none" />
      </div>

      <!-- 4. Jeux 100% Prêts -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 shrink-0">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Jeux 100% Prêts</span>
            <span class="text-[9px] text-brand-400">Zéro Upgrade</span>
          </div>
          <div class="text-2xl font-black text-brand-300 font-mono mt-0.5">
            {{ summaryStats.ready100Count }} <span class="text-xs text-slate-400 font-normal">/ {{ summaryStats.totalGames }} jeux</span>
          </div>
          <div class="text-[10px] font-mono text-brand-300/80 mt-0.5 truncate">
            Compatibles avec toutes les configs
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/15 transition-all pointer-events-none" />
      </div>
    </div>

    <!-- Controls Bar : Search, Tournament Filter, Acquisition Filters & View Switcher -->
    <div class="space-y-3">
      <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <!-- Search bar -->
        <div class="relative flex-1 max-w-md">
          <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher un jeu (nom, genre, description)..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500 font-mono"
          />
        </div>

        <!-- Filters & View Switcher Group -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- 1. Tournament Filter Selector -->
          <div class="relative flex items-center">
            <div class="relative">
              <Trophy class="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                v-model="selectedTournamentId"
                class="pl-9 pr-8 py-2 rounded-xl text-xs font-semibold bg-slate-900 border text-slate-300 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer transition-all shadow-sm max-w-[220px] sm:max-w-xs truncate"
                :class="selectedTournamentId ? 'border-amber-500/60 bg-amber-950/20 text-amber-200 font-bold' : 'border-slate-800'"
              >
                <option value="">Tous les tournois (Catalogue complet)</option>
                <option v-for="t in tournaments" :key="t.id" :value="t.id">
                  🏆 {{ t.name }} ({{ t.tournamentGames?.length || t.games?.length || 0 }} jeux)
                </option>
              </select>
              <ChevronDown class="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              v-if="selectedTournamentId"
              @click="selectedTournamentId = ''"
              class="ml-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              title="Réinitialiser le filtre de tournoi"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- 2. Acquisition Filters (All, Free, Paid) -->
          <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              @click="acquisitionFilter = 'ALL'"
              class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              :class="acquisitionFilter === 'ALL' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
            >
              Tous
            </button>
            <button
              @click="acquisitionFilter = 'FREE'"
              class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              :class="acquisitionFilter === 'FREE' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold' : 'text-slate-400 hover:text-slate-200'"
            >
              <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
              <span>Gratuits</span>
            </button>
            <button
              @click="acquisitionFilter = 'PAID'"
              class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              :class="acquisitionFilter === 'PAID' ? 'bg-blue-950/80 text-blue-300 border border-blue-800 font-bold' : 'text-slate-400 hover:text-slate-200'"
            >
              <Store class="w-3.5 h-3.5 text-blue-400" />
              <span>Payants</span>
            </button>
          </div>

          <!-- 3. Sort Selector (Nom, Prix, Compatibilité) -->
          <div class="relative flex items-center">
            <div class="relative">
              <ArrowUpDown class="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                :value="`${sortBy}_${sortOrder}`"
                @change="(e: any) => {
                  const [field, order] = e.target.value.split('_')
                  sortBy = field
                  sortOrder = order
                }"
                class="pl-8 pr-8 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all shadow-sm max-w-[220px] truncate font-mono"
              >
                <option value="name_asc">Tri : Nom (A → Z)</option>
                <option value="name_desc">Tri : Nom (Z → A)</option>
                <option value="price_asc">Tri : Prix (Moins cher)</option>
                <option value="price_desc">Tri : Prix (Plus cher)</option>
                <option value="compatibility_desc">Tri : Compatibilité (Plus prêt)</option>
                <option value="compatibility_asc">Tri : Compatibilité (Moins prêt)</option>
              </select>
              <ChevronDown class="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <!-- 4. Flip-Flop Button: Cards / Grid vs Table View -->
          <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              @click="viewMode = 'grid'"
              class="p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              :class="viewMode === 'grid' ? 'bg-cyan-600 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
              title="Vue Cartes"
            >
              <LayoutGrid class="w-4 h-4" />
              <span class="hidden sm:inline">Cartes</span>
            </button>
            <button
              @click="viewMode = 'table'"
              class="p-1.5 sm:px-3 sm:py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
              :class="viewMode === 'table' ? 'bg-cyan-600 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
              title="Vue Tableau synthétique"
            >
              <List class="w-4 h-4" />
              <span class="hidden sm:inline">Tableau</span>
            </button>
          </div>

          <div class="text-xs font-mono text-slate-400 hidden xl:block">
            {{ filteredGames.length }} jeu(x)
          </div>
        </div>
      </div>

      <!-- Active Tournament Banner when filtered -->
      <div
        v-if="selectedTournament"
        class="flex items-center justify-between p-2.5 px-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 font-mono"
      >
        <div class="flex items-center gap-2">
          <Trophy class="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Filtré sur le tournoi : <strong class="text-white">{{ selectedTournament.name }}</strong>
            ({{ filteredGames.length }} jeu(x) au programme)
          </span>
        </div>
        <button
          @click="selectedTournamentId = ''"
          class="text-amber-400 hover:text-amber-200 underline text-[11px] cursor-pointer"
        >
          Afficher tous les jeux
        </button>
      </div>
    </div>

    <!-- VIEW 1: GRID / CARDS VIEW -->
    <div
      v-if="viewMode === 'grid'"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div
        v-for="game in filteredGames"
        :key="game.id"
        class="cyber-card p-0 overflow-hidden flex flex-col justify-between group border-slate-800/80 hover:border-cyan-500/50 transition-all duration-300"
      >
        <div>
          <!-- Game Image Banner + Overlay Badges -->
          <div class="relative h-48 w-full overflow-hidden bg-slate-950">
            <img
              :src="game.coverUrl || 'https://placehold.co/600x400/0f172a/38bdf8?text=Jeu'"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              alt="cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <!-- Acquisition Type Badge (Top-Left) -->
            <div class="absolute top-3 left-3 flex flex-col gap-1.5">
              <div v-if="game.acquisitionType === 'FREE_TO_PLAY'">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 shadow-lg backdrop-blur-sm">
                  <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                  <span>Free-to-Play</span>
                </span>
              </div>
              <div v-else-if="game.acquisitionType === 'FRIEND_SHARE'">
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-700/80 shadow-lg backdrop-blur-sm">
                  <Users class="w-3.5 h-3.5 text-purple-400" />
                  <span>Partage LAN (1 Achat)</span>
                </span>
              </div>
              <div v-else>
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/90 text-blue-300 border border-blue-700/80 shadow-lg backdrop-blur-sm">
                  <Store class="w-3.5 h-3.5 text-blue-400" />
                  <span>Achat Requis</span>
                </span>
              </div>
            </div>

            <!-- Action buttons (Top-Right) -->
            <div class="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
              <button
                @click="refreshSingleGamePrices(game.id)"
                :disabled="refreshingPrices[game.id]"
                class="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700 backdrop-blur-sm transition-all cursor-pointer disabled:opacity-50"
                title="Actualiser les prix"
              >
                <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshingPrices[game.id] }" />
              </button>
              <button
                @click="openEditModal(game)"
                class="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-700 backdrop-blur-sm transition-all cursor-pointer"
                title="Modifier"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteGame(game.id, game.name)"
                class="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-rose-400 border border-slate-700 backdrop-blur-sm transition-all cursor-pointer"
                title="Supprimer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Title & Genres (Bottom of Image) -->
            <div class="absolute bottom-3 left-3 right-3">
              <h3 class="font-black text-lg text-white leading-tight truncate drop-shadow-md">
                {{ game.name }}
              </h3>
              <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-300 font-mono">
                <span v-if="game.steamAppId" class="text-[10px] text-blue-400 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-800">
                  AppID: {{ game.steamAppId }}
                </span>
                <span v-if="game.genres" class="text-[11px] text-slate-300 truncate">
                  {{ game.genres }}
                </span>
              </div>
            </div>
          </div>

          <!-- Card Content Body -->
          <div class="p-5 space-y-4">
            <!-- Game Summary -->
            <p v-if="game.summary" class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {{ game.summary }}
            </p>

            <!-- 1. SECTION TARIFICATION & ACQUISITION -->
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <!-- En-tête : Prix effectif du participant -->
              <div class="flex items-center justify-between">
                <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Tarif Joueur :
                </div>
                <div class="text-right">
                  <div
                    class="text-base font-black font-mono tracking-tight"
                    :class="
                      getEffectivePrice(game).is_free
                        ? 'text-emerald-400'
                        : 'text-cyan-300'
                    "
                  >
                    {{ getEffectivePrice(game).display_price }}
                  </div>
                  <div class="text-[10px] font-mono text-slate-500">
                    {{ getEffectivePrice(game).source_label }}
                  </div>
                </div>
              </div>

              <!-- Si Friend Share : lien de téléchargement -->
              <div
                v-if="game.acquisitionType === 'FRIEND_SHARE' && game.friendDownloadUrl"
                class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono"
              >
                <span class="text-purple-300 text-[11px]">Install Partagé :</span>
                <a
                  :href="game.friendDownloadUrl.startsWith('http') ? game.friendDownloadUrl : undefined"
                  :target="game.friendDownloadUrl.startsWith('http') ? '_blank' : undefined"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 hover:text-purple-200 border border-purple-800/80 text-[11px] font-bold transition-all truncate max-w-[180px]"
                  :title="game.friendDownloadUrl"
                >
                  <Download class="w-3 h-3 shrink-0" />
                  <span class="truncate">{{ game.friendDownloadUrl.startsWith('http') ? 'Télécharger' : game.friendDownloadUrl }}</span>
                  <ExternalLink v-if="game.friendDownloadUrl.startsWith('http')" class="w-2.5 h-2.5 shrink-0 opacity-70" />
                </a>
              </div>

              <!-- Si Store Buy : Comparatif Steam vs Clé revendeur -->
              <div
                v-else-if="game.acquisitionType === 'STORE_BUY'"
                class="pt-2 border-t border-slate-800/60 space-y-2 font-mono"
              >
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <!-- Steam Official Price Box -->
                  <a
                    v-if="getEffectivePrice(game).steam_url"
                    :href="getEffectivePrice(game).steam_url!"
                    target="_blank"
                    class="p-2 rounded-lg border flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer group/steam"
                    :class="
                      getEffectivePrice(game).source === 'STEAM'
                        ? 'bg-blue-950/40 border-blue-500/80 text-white hover:border-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    "
                    title="Ouvrir la page officielle Steam"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-blue-300 flex items-center gap-1 group-hover/steam:text-blue-200">
                        <Store class="w-3 h-3" />
                        <span>Steam</span>
                      </span>
                      <div class="flex items-center gap-1">
                        <span v-if="getEffectivePrice(game).source === 'STEAM'" class="text-[9px] text-cyan-400 uppercase font-bold">Meilleur</span>
                        <ExternalLink class="w-2.5 h-2.5 text-slate-500 group-hover/steam:text-cyan-300" />
                      </div>
                    </div>
                    <div class="text-sm font-bold text-white mt-1">
                      {{ formatCentsToPrice(game.steamPriceCents, game.currency) }}
                    </div>
                  </a>
                  <div
                    v-else
                    class="p-2 rounded-lg border flex flex-col justify-between bg-slate-900 border-slate-800 text-slate-400"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-blue-300 flex items-center gap-1">
                        <Store class="w-3 h-3" />
                        <span>Steam</span>
                      </span>
                    </div>
                    <div class="text-sm font-bold text-white mt-1">
                      {{ formatCentsToPrice(game.steamPriceCents, game.currency) }}
                    </div>
                  </div>

                  <!-- Keyshop / GG Deals Best Price Box -->
                  <a
                    v-if="getEffectivePrice(game).keyshop_url"
                    :href="getEffectivePrice(game).keyshop_url!"
                    target="_blank"
                    class="p-2 rounded-lg border flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer group/keyshop"
                    :class="
                      getEffectivePrice(game).source === 'KEYSHOP'
                        ? 'bg-emerald-950/40 border-emerald-500/80 text-white hover:border-emerald-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    "
                    title="Ouvrir le deal revendeur / GG.deals"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-purple-300 flex items-center gap-1 group-hover/keyshop:text-purple-200">
                        <Tag class="w-3 h-3" />
                        <span>Clé Revendeur</span>
                      </span>
                      <div class="flex items-center gap-1">
                        <span v-if="getEffectivePrice(game).source === 'KEYSHOP'" class="text-[9px] text-emerald-400 uppercase font-bold">Meilleur</span>
                        <ExternalLink class="w-2.5 h-2.5 text-slate-500 group-hover/keyshop:text-emerald-300" />
                      </div>
                    </div>
                    <div class="text-sm font-bold text-emerald-400 mt-1">
                      {{ formatCentsToPrice(game.keyshopPriceCents, game.currency) }}
                    </div>
                  </a>
                  <div
                    v-else
                    class="p-2 rounded-lg border flex flex-col justify-between bg-slate-900 border-slate-800 text-slate-400"
                  >
                    <div class="flex items-center justify-between text-[10px]">
                      <span class="text-purple-300 flex items-center gap-1">
                        <Tag class="w-3 h-3" />
                        <span>Clé Revendeur</span>
                      </span>
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

            <!-- Compatibility Status Box -->
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div class="text-[11px] font-mono text-slate-300 font-bold uppercase tracking-wider flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <Activity class="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compatibilité Parc :</span>
                </span>
                <span
                  class="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                  :class="
                    matrixData?.gameStats?.[game.id]?.is100PercentReady
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : (matrixData?.gameStats?.[game.id]?.percentReady ?? 0) > 0
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  "
                >
                  {{ matrixData?.gameStats?.[game.id]?.percentReady ?? 0 }}% prêts
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="
                    matrixData?.gameStats?.[game.id]?.is100PercentReady
                      ? 'bg-gradient-to-r from-cyan-500 to-brand-500'
                      : (matrixData?.gameStats?.[game.id]?.percentReady ?? 0) > 0
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-rose-500'
                  "
                  :style="{ width: `${matrixData?.gameStats?.[game.id]?.percentReady ?? 0}%` }"
                />
              </div>

              <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Configurations compatibles</span>
                <span class="text-white font-semibold">
                  {{ matrixData?.gameStats?.[game.id]?.compatibleCount ?? 0 }} / {{ matrixData?.gameStats?.[game.id]?.totalParticipants ?? 0 }} joueurs
                </span>
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

    <!-- VIEW 2: HIGH-DENSITY TABLE VIEW -->
    <div v-else class="cyber-card overflow-hidden border-slate-800 p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr class="border-b border-slate-800 bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider select-none">
              <!-- 1. Jeu / Nom -->
              <th
                @click="toggleSort('name')"
                class="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group/th"
                title="Cliquer pour trier par nom"
              >
                <div class="flex items-center gap-1.5">
                  <span :class="{ 'text-cyan-400 font-bold': sortBy === 'name' }">Jeu</span>
                  <ArrowUp v-if="sortBy === 'name' && sortOrder === 'asc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowDown v-else-if="sortBy === 'name' && sortOrder === 'desc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 shrink-0" />
                </div>
              </th>

              <!-- 2. Acquisition -->
              <th class="py-3.5 px-4">Acquisition & Partage</th>

              <!-- 3. Tarif Effectif -->
              <th
                @click="toggleSort('price')"
                class="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group/th"
                title="Cliquer pour trier par prix"
              >
                <div class="flex items-center gap-1.5">
                  <span :class="{ 'text-cyan-400 font-bold': sortBy === 'price' }">Tarif Effectif (Meilleur)</span>
                  <ArrowUp v-if="sortBy === 'price' && sortOrder === 'asc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowDown v-else-if="sortBy === 'price' && sortOrder === 'desc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 shrink-0" />
                </div>
              </th>

              <!-- 4. Steam vs Clé -->
              <th class="py-3.5 px-4">Steam vs Clé</th>

              <!-- 5. Compatibilité Parc (% OK) -->
              <th
                @click="toggleSort('compatibility')"
                class="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group/th"
                title="Cliquer pour trier par compatibilité"
              >
                <div class="flex items-center gap-1.5">
                  <span :class="{ 'text-cyan-400 font-bold': sortBy === 'compatibility' }">Compatibilité Parc (% OK)</span>
                  <ArrowUp v-if="sortBy === 'compatibility' && sortOrder === 'asc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowDown v-else-if="sortBy === 'compatibility' && sortOrder === 'desc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 shrink-0" />
                </div>
              </th>

              <!-- 6. Actions -->
              <th class="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 bg-slate-900/60">
            <tr
              v-for="game in filteredGames"
              :key="game.id"
              class="hover:bg-slate-800/50 transition-colors group"
            >
              <!-- 1. Jeu -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-3">
                  <img
                    :src="game.coverUrl || 'https://placehold.co/100x140/0f172a/38bdf8?text=Jeu'"
                    class="w-10 h-14 object-cover rounded-lg bg-slate-950 border border-slate-800 shrink-0 shadow"
                    alt="cover"
                  />
                  <div class="min-w-0 max-w-[200px] sm:max-w-xs">
                    <h4 class="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                      {{ game.name }}
                    </h4>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span v-if="game.steamAppId" class="text-[10px] text-blue-300 font-mono">
                        #{{ game.steamAppId }}
                      </span>
                      <span v-if="game.genres" class="text-[10px] text-slate-400 font-mono truncate">
                        {{ game.genres }}
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- 2. Acquisition -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div v-if="game.acquisitionType === 'FREE_TO_PLAY'">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                    <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                    <span>Free-to-Play</span>
                  </span>
                </div>
                <div v-else-if="game.acquisitionType === 'FRIEND_SHARE'" class="space-y-1">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                    <Users class="w-3.5 h-3.5 text-purple-400" />
                    <span>Partage LAN</span>
                  </span>
                  <div v-if="game.friendDownloadUrl">
                    <a
                      :href="game.friendDownloadUrl.startsWith('http') ? game.friendDownloadUrl : undefined"
                      :target="game.friendDownloadUrl.startsWith('http') ? '_blank' : undefined"
                      class="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:underline max-w-[150px] truncate"
                      :title="game.friendDownloadUrl"
                    >
                      <Download class="w-3 h-3 shrink-0" />
                      <span class="truncate">Télécharger</span>
                    </a>
                  </div>
                </div>
                <div v-else>
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                    <Store class="w-3 h-3 text-blue-400" />
                    <span>Achat Store</span>
                  </span>
                </div>
              </td>

              <!-- 3. Tarif Effectif -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="flex flex-col">
                  <span
                    class="font-extrabold text-sm"
                    :class="
                      getEffectivePrice(game).is_free
                        ? 'text-emerald-400'
                        : 'text-cyan-300'
                    "
                  >
                    {{ getEffectivePrice(game).display_price }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ getEffectivePrice(game).source_label }}
                  </span>
                </div>
              </td>

              <!-- 4. Steam vs Clé -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div v-if="game.acquisitionType === 'STORE_BUY'" class="space-y-1 text-[11px] font-mono">
                  <div>
                    <a
                      v-if="getEffectivePrice(game).steam_url"
                      :href="getEffectivePrice(game).steam_url!"
                      target="_blank"
                      class="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200 hover:underline"
                      title="Ouvrir la page du store Steam"
                    >
                      <Store class="w-3 h-3 text-blue-400" />
                      <span>Steam : <strong>{{ formatCentsToPrice(game.steamPriceCents, game.currency) }}</strong></span>
                      <ExternalLink class="w-2.5 h-2.5 opacity-60" />
                    </a>
                    <span v-else class="text-blue-300 inline-flex items-center gap-1">
                      <Store class="w-3 h-3 text-blue-400" />
                      <span>Steam : <strong>{{ formatCentsToPrice(game.steamPriceCents, game.currency) }}</strong></span>
                    </span>
                  </div>
                  <div>
                    <a
                      v-if="getEffectivePrice(game).keyshop_url"
                      :href="getEffectivePrice(game).keyshop_url!"
                      target="_blank"
                      class="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                      title="Ouvrir l'offre revendeur de clés"
                    >
                      <Tag class="w-3 h-3 text-emerald-400" />
                      <span>Clé : <strong>{{ formatCentsToPrice(game.keyshopPriceCents, game.currency) }}</strong></span>
                      <ExternalLink class="w-2.5 h-2.5 opacity-60" />
                    </a>
                    <span v-else class="text-emerald-400 inline-flex items-center gap-1">
                      <Tag class="w-3 h-3 text-emerald-400" />
                      <span>Clé : <strong>{{ formatCentsToPrice(game.keyshopPriceCents, game.currency) }}</strong></span>
                    </span>
                  </div>
                  <div v-if="getEffectivePrice(game).savings_cents && getEffectivePrice(game).savings_cents! > 0" class="text-[10px] text-emerald-300 font-bold">
                    -{{ getEffectivePrice(game).savings_percent }}% ({{ formatCentsToPrice(getEffectivePrice(game).savings_cents) }})
                  </div>
                </div>
                <div v-else class="text-slate-500 text-[11px] font-mono">
                  0,00 € (Inclus)
                </div>
              </td>

              <!-- 5. Compatibilité Parc (% OK) -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                    :class="
                      matrixData?.gameStats?.[game.id]?.is100PercentReady
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                        : (matrixData?.gameStats?.[game.id]?.percentReady ?? 0) > 0
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    "
                  >
                    {{ matrixData?.gameStats?.[game.id]?.percentReady ?? 0 }}% prêts
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    ({{ matrixData?.gameStats?.[game.id]?.compatibleCount ?? 0 }}/{{ matrixData?.gameStats?.[game.id]?.totalParticipants ?? 0 }} joueurs)
                  </span>
                </div>
              </td>

              <!-- 6. Actions -->
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="refreshSingleGamePrices(game.id)"
                    :disabled="refreshingPrices[game.id]"
                    class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all cursor-pointer disabled:opacity-50"
                    title="Actualiser tarifs"
                  >
                    <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshingPrices[game.id] }" />
                  </button>
                  <button
                    @click="openEditModal(game)"
                    class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-all cursor-pointer"
                    title="Modifier"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="deleteGame(game.id, game.name)"
                    class="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="filteredGames.length === 0"
      class="cyber-card p-12 text-center text-slate-400 space-y-3"
    >
      <Gamepad2 class="w-10 h-10 text-slate-600 mx-auto" />
      <h3 class="text-base font-bold text-white">Aucun jeu ne correspond à vos filtres</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto">
        Modifiez votre recherche, changez le filtre de tournoi ou importez de nouveaux jeux dans votre catalogue.
      </p>
      <button
        @click="searchQuery = ''; selectedTournamentId = ''; acquisitionFilter = 'ALL'"
        class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold cursor-pointer"
      >
        Réinitialiser tous les filtres
      </button>
    </div>

    <!-- Game Modal -->
    <GameModal
      :isOpen="isModalOpen"
      :gameToEdit="selectedGame"
      @close="isModalOpen = false"
      @saved="() => { refresh(); refreshMatrix() }"
    />
  </div>
</template>
