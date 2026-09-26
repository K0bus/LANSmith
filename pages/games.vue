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

const isModalOpen = ref(false)
const selectedGame = ref<any>(null)
const searchQuery = ref('')
const acquisitionFilter = ref<'ALL' | 'FREE' | 'PAID'>('ALL')
const selectedTournamentId = ref<string>('')
const viewMode = ref<'grid' | 'table'>('grid')

// Sorting state: name, price, minGpu, recGpu, minCpu, recCpu
const sortBy = ref<'name' | 'price' | 'minGpu' | 'recGpu' | 'minCpu' | 'recCpu'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

function toggleSort(field: 'name' | 'price' | 'minGpu' | 'recGpu' | 'minCpu' | 'recCpu') {
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
    } else if (sortBy.value === 'minGpu') {
      diff = (a.minGpuScore || 0) - (b.minGpuScore || 0)
    } else if (sortBy.value === 'recGpu') {
      diff = (a.recGpuScore || 0) - (b.recGpuScore || 0)
    } else if (sortBy.value === 'minCpu') {
      diff = (a.minCpuScore || 0) - (b.minCpuScore || 0)
    } else if (sortBy.value === 'recCpu') {
      diff = (a.recCpuScore || 0) - (b.recCpuScore || 0)
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
      avgMinGpu: 0,
      avgRecGpu: 0,
      avgMinCpu: 0,
      avgRecCpu: 0,
      avgMinRamGb: 0,
      avgRecRamGb: 0
    }
  }

  let freeGamesCount = 0
  let paidGamesCount = 0
  let totalEstimatedCents = 0
  let totalSteamFullCents = 0

  let sumMinGpu = 0
  let sumRecGpu = 0
  let sumMinCpu = 0
  let sumRecCpu = 0
  let sumMinRam = 0
  let sumRecRam = 0

  for (const g of list) {
    const eff = getEffectivePrice(g)
    if (eff.is_free) {
      freeGamesCount++
    } else {
      paidGamesCount++
      totalEstimatedCents += eff.raw_cents || 0
      totalSteamFullCents += g.steamPriceCents || eff.raw_cents || 0
    }

    sumMinGpu += g.minGpuScore || 0
    sumRecGpu += g.recGpuScore || 0
    sumMinCpu += g.minCpuScore || 0
    sumRecCpu += g.recCpuScore || 0
    sumMinRam += g.minRamGb || 8
    sumRecRam += g.recRamGb || 16
  }

  const totalSavingsCents = Math.max(0, totalSteamFullCents - totalEstimatedCents)

  return {
    totalGames,
    freeGamesCount,
    paidGamesCount,
    totalEstimatedCents,
    totalSteamFullCents,
    totalSavingsCents,
    avgMinGpu: Math.round(sumMinGpu / totalGames),
    avgRecGpu: Math.round(sumRecGpu / totalGames),
    avgMinCpu: Math.round(sumMinCpu / totalGames),
    avgRecCpu: Math.round(sumRecCpu / totalGames),
    avgMinRamGb: Number((sumMinRam / totalGames).toFixed(1)),
    avgRecRamGb: Number((sumRecRam / totalGames).toFixed(1))
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

      <!-- 3. Moyenne Score GPU -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
          <Monitor class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Moyenne GPU</span>
            <span class="text-[9px] text-purple-400">G3D Mark</span>
          </div>
          <div class="text-2xl font-black text-purple-300 font-mono mt-0.5">
            {{ summaryStats.avgMinGpu }} <span class="text-xs text-slate-400 font-normal">pts (Min)</span>
          </div>
          <div class="text-[10px] font-mono text-purple-300/80 mt-0.5 truncate">
            Rec : <strong>{{ summaryStats.avgRecGpu }} pts</strong>
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/15 transition-all pointer-events-none" />
      </div>

      <!-- 4. Moyenne Score CPU & RAM -->
      <div class="cyber-card p-4 bg-slate-950/80 border-slate-800 flex items-center gap-4 relative overflow-hidden group">
        <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
          <Cpu class="w-6 h-6" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Moyenne CPU & RAM</span>
            <span class="text-[9px] text-blue-400">PassMark</span>
          </div>
          <div class="text-2xl font-black text-cyan-300 font-mono mt-0.5">
            {{ summaryStats.avgMinCpu }} <span class="text-xs text-slate-400 font-normal">pts (Min)</span>
          </div>
          <div class="text-[10px] font-mono text-blue-300/80 mt-0.5 truncate">
            Rec : <strong>{{ summaryStats.avgRecCpu }} pts</strong> • RAM : <strong>{{ summaryStats.avgMinRamGb }} Go</strong>
          </div>
        </div>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/15 transition-all pointer-events-none" />
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

          <!-- 3. Sort Selector (Nom, Prix, Specs) -->
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
                class="pl-8 pr-8 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-cyan-500/50 appearance-none cursor-pointer transition-all shadow-sm max-w-[210px] truncate font-mono"
              >
                <option value="name_asc">Tri : Nom (A → Z)</option>
                <option value="name_desc">Tri : Nom (Z → A)</option>
                <option value="price_asc">Tri : Prix (Moins cher)</option>
                <option value="price_desc">Tri : Prix (Plus cher)</option>
                <option value="minGpu_asc">Tri : GPU Min (Plus léger)</option>
                <option value="minGpu_desc">Tri : GPU Min (Plus lourd)</option>
                <option value="recGpu_asc">Tri : GPU Rec (Plus léger)</option>
                <option value="recGpu_desc">Tri : GPU Rec (Plus lourd)</option>
                <option value="minCpu_asc">Tri : CPU Min (Plus léger)</option>
                <option value="minCpu_desc">Tri : CPU Min (Plus lourd)</option>
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
          class="text-[11px] underline text-amber-400 hover:text-amber-200 cursor-pointer"
        >
          Afficher tous les jeux
        </button>
      </div>
    </div>

    <!-- VIEW 1: GRID / CARDS VIEW -->
    <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <a
                v-else-if="getEffectivePrice(game).source === 'KEYSHOP' && getEffectivePrice(game).keyshop_url"
                :href="getEffectivePrice(game).keyshop_url!"
                target="_blank"
                class="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-emerald-500/80 hover:border-emerald-400 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg group/tag transition-all"
                title="Acheter au meilleur prix (Store revendeur)"
              >
                <Tag class="w-3.5 h-3.5 text-emerald-400" />
                <span class="text-emerald-300 font-extrabold">{{ getEffectivePrice(game).display_price }}</span>
                <span class="text-[10px] text-slate-300 font-normal">({{ getEffectivePrice(game).source_label }})</span>
                <ExternalLink class="w-3 h-3 text-slate-400 group-hover/tag:text-emerald-300 ml-0.5" />
              </a>

              <a
                v-else-if="getEffectivePrice(game).source === 'STEAM' && getEffectivePrice(game).steam_url"
                :href="getEffectivePrice(game).steam_url!"
                target="_blank"
                class="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-cyan-500/80 hover:border-cyan-400 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg group/tag transition-all"
                title="Acheter sur le store officiel Steam"
              >
                <Tag class="w-3.5 h-3.5 text-cyan-400" />
                <span class="text-cyan-300 font-extrabold">{{ getEffectivePrice(game).display_price }}</span>
                <span class="text-[10px] text-slate-300 font-normal">({{ getEffectivePrice(game).source_label }})</span>
                <ExternalLink class="w-3 h-3 text-slate-400 group-hover/tag:text-cyan-300 ml-0.5" />
              </a>

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
                <a
                  v-if="game.steamAppId"
                  :href="`https://store.steampowered.com/app/${game.steamAppId}`"
                  target="_blank"
                  class="text-[10px] text-blue-300 hover:text-blue-200 font-mono hover:underline inline-flex items-center gap-0.5"
                  title="Ouvrir la fiche Steam"
                >
                  <span>Steam #{{ game.steamAppId }}</span>
                  <ExternalLink class="w-2.5 h-2.5" />
                </a>
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
              <div v-else-if="game.acquisitionType === 'FREE_TO_PLAY'" class="space-y-2">
                <div class="flex items-center justify-between p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs">
                  <span class="text-emerald-300 font-bold flex items-center gap-1.5">
                    <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
                    <span>Free-to-Play officiel</span>
                  </span>
                  <span class="text-emerald-400 font-mono font-bold">0,00 €</span>
                </div>
                <a
                  v-if="getEffectivePrice(game).steam_url"
                  :href="getEffectivePrice(game).steam_url!"
                  target="_blank"
                  class="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/50 text-blue-300 text-xs font-mono transition-all"
                >
                  <span class="flex items-center gap-1.5">
                    <Store class="w-3 h-3 text-blue-400" />
                    <span>Télécharger / Installer sur Steam</span>
                  </span>
                  <ExternalLink class="w-3 h-3" />
                </a>
              </div>

              <!-- Cas 3: Store / Clés avec Comparateur Steam vs Marché Gris -->
              <div v-else class="space-y-1.5">
                <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                  <!-- Steam Official Store Link -->
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
                        <span v-if="getEffectivePrice(game).source === 'STEAM'" class="text-[9px] text-cyan-400 uppercase font-bold">Choisi</span>
                        <ExternalLink class="w-2.5 h-2.5 text-slate-500 group-hover/steam:text-blue-300" />
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

                  <!-- Keyshop / Gray Market Deal Link -->
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

            <!-- Minimum Specs Box -->
            <div class="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
              <div class="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Spécifications Minimales :</span>
                <span class="text-[10px] text-slate-500 font-normal">Plancher 720p/1080p</span>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min GPU</span>
                  <span class="text-purple-300 font-bold">{{ game.minGpuScore }} pts</span>
                </div>

                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min CPU</span>
                  <span class="text-cyan-300 font-bold">{{ game.minCpuScore }} pts</span>
                </div>

                <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400 text-[10px]">Min RAM</span>
                  <span class="text-emerald-400 font-bold">{{ game.minRamGb }} Go</span>
                </div>

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

              <!-- 5. Specs Min -->
              <th
                @click="toggleSort('minGpu')"
                class="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group/th"
                title="Cliquer pour trier par score GPU/CPU minimal"
              >
                <div class="flex items-center gap-1.5">
                  <span :class="{ 'text-cyan-400 font-bold': sortBy === 'minGpu' || sortBy === 'minCpu' }">Specs Min (GPU / CPU / RAM)</span>
                  <ArrowUp v-if="sortBy === 'minGpu' && sortOrder === 'asc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowDown v-else-if="sortBy === 'minGpu' && sortOrder === 'desc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 shrink-0" />
                </div>
              </th>

              <!-- 6. Specs Rec -->
              <th
                @click="toggleSort('recGpu')"
                class="py-3.5 px-4 cursor-pointer hover:text-white transition-colors group/th"
                title="Cliquer pour trier par score GPU/CPU recommandé"
              >
                <div class="flex items-center gap-1.5">
                  <span :class="{ 'text-cyan-400 font-bold': sortBy === 'recGpu' || sortBy === 'recCpu' }">Specs Rec (GPU / CPU / RAM)</span>
                  <ArrowUp v-if="sortBy === 'recGpu' && sortOrder === 'asc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowDown v-else-if="sortBy === 'recGpu' && sortOrder === 'desc'" class="w-3 h-3 text-cyan-400 shrink-0" />
                  <ArrowUpDown v-else class="w-3 h-3 text-slate-600 group-hover/th:text-slate-400 shrink-0" />
                </div>
              </th>

              <!-- 7. Actions -->
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
                    <Sparkles class="w-3 h-3 text-emerald-400" />
                    <span>Free-to-Play</span>
                  </span>
                </div>
                <div v-else-if="game.acquisitionType === 'FRIEND_SHARE'" class="space-y-1">
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                    <Users class="w-3 h-3 text-purple-400" />
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

              <!-- 5. Specs Min -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="text-[11px] space-y-0.5">
                  <div class="text-purple-300 font-bold">GPU: {{ game.minGpuScore }} pts</div>
                  <div class="text-cyan-300">CPU: {{ game.minCpuScore }} pts</div>
                  <div class="text-emerald-400">RAM: {{ game.minRamGb }} Go</div>
                </div>
              </td>

              <!-- 6. Specs Rec -->
              <td class="py-3 px-4 whitespace-nowrap">
                <div class="text-[11px] space-y-0.5">
                  <div class="text-purple-300 font-bold">GPU: {{ game.recGpuScore }} pts</div>
                  <div class="text-cyan-300">CPU: {{ game.recCpuScore }} pts</div>
                  <div class="text-emerald-400">RAM: {{ game.recRamGb }} Go</div>
                </div>
              </td>

              <!-- 7. Actions -->
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
      @saved="refresh"
    />
  </div>
</template>
