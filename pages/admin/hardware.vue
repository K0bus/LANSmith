<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Cpu,
  Monitor,
  Search,
  Plus,
  Edit2,
  Trash2,
  Filter,
  RefreshCw,
  Gauge,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Check,
  X,
  SlidersHorizontal
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const searchInput = ref('')
const selectedType = ref<'all' | 'gpu' | 'cpu'>('all')
const selectedTier = ref<number | ''>('')
const sortBy = ref<'score' | 'name' | 'tier'>('score')
const sortOrder = ref<'desc' | 'asc'>('desc')
const currentPage = ref(1)
const itemsPerPage = ref(30)

// Modal state
const isModalOpen = ref(false)
const editingItem = ref<any>(null)
const modalForm = ref({
  type: 'gpu' as 'gpu' | 'cpu',
  name: '',
  score: 10000,
  tier: 3
})
const isSubmitting = ref(false)
const modalError = ref('')

const queryParams = computed(() => ({
  q: searchInput.value.trim(),
  type: selectedType.value,
  tier: selectedTier.value || undefined,
  sortBy: sortBy.value,
  order: sortOrder.value,
  page: currentPage.value,
  limit: itemsPerPage.value
}))

const { data, pending, refresh } = await useFetch<any>('/api/hardware', {
  params: queryParams,
  watch: [queryParams]
})

// Debounced search
let searchTimer: any = null
function onSearchChange(val: string) {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchInput.value = val
    currentPage.value = 1
  }, 250)
}

function getTierLabel(tier: number) {
  switch (tier) {
    case 5:
      return 'Tier 5 (Enthusiast)'
    case 4:
      return 'Tier 4 (High Performance)'
    case 3:
      return 'Tier 3 (Mid-Range)'
    case 2:
      return 'Tier 2 (Entry-Level)'
    default:
      return 'Tier 1 (Legacy / iGPU)'
  }
}

function getTierBadgeClass(tier: number) {
  switch (tier) {
    case 5:
      return 'bg-purple-950/80 text-purple-300 border-purple-800'
    case 4:
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
    case 3:
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
    case 2:
      return 'bg-amber-950/80 text-amber-300 border-amber-800'
    default:
      return 'bg-slate-900 text-slate-400 border-slate-800'
  }
}

function openAddModal() {
  editingItem.value = null
  modalForm.value = {
    type: 'gpu',
    name: '',
    score: 15000,
    tier: 4
  }
  modalError.value = ''
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingItem.value = item
  modalForm.value = {
    type: item.type,
    name: item.name,
    score: item.score,
    tier: item.tier
  }
  modalError.value = ''
  isModalOpen.value = true
}

async function saveComponent() {
  if (!modalForm.value.name.trim()) {
    modalError.value = 'Le nom du composant est obligatoire.'
    return
  }

  isSubmitting.value = true
  modalError.value = ''

  try {
    if (editingItem.value?.id) {
      await $fetch(`/api/hardware/${editingItem.value.id}`, {
        method: 'PUT',
        body: modalForm.value
      })
    } else {
      await $fetch('/api/hardware', {
        method: 'POST',
        body: modalForm.value
      })
    }
    isModalOpen.value = false
    refresh()
  } catch (err: any) {
    modalError.value = err.data?.statusMessage || 'Erreur lors de la sauvegarde.'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteComponent(item: any) {
  if (!confirm(`Supprimer le composant "${item.name}" (${item.type.toUpperCase()}) de la base de benchmarks ?`))
    return

  try {
    await $fetch(`/api/hardware/${item.id}`, {
      method: 'DELETE',
      params: { type: item.type }
    })
    refresh()
  } catch (err: any) {
    alert('Erreur lors de la suppression.')
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold mb-2">
          <Database class="w-3.5 h-3.5 text-purple-400" />
          <span>Base de Données Hardware & PassMark Benchmarks</span>
        </div>
        <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
          <Gauge class="w-6 h-6 text-brand-400" />
          <span>Composants Enregistrés & Scores de Performance</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Indexation des cartes graphiques (G3D Mark) et processeurs (CPU Gaming Mark) pour le calcul de compatibilité
        </p>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <button
          @click="refresh()"
          class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          title="Actualiser la liste"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': pending }" />
        </button>

        <button
          @click="openAddModal"
          class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Ajouter un Composant</span>
        </button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <div class="text-[11px] font-mono text-purple-400 flex items-center gap-1.5 font-bold">
            <Monitor class="w-3.5 h-3.5" />
            <span>Total GPUs Indexés</span>
          </div>
          <div class="text-2xl font-black text-white font-mono mt-1">
            {{ data?.stats?.totalGpus?.toLocaleString() || 0 }}
          </div>
        </div>
        <div class="text-right font-mono text-[10px] text-slate-500">
          Max: <span class="text-purple-300 font-bold">{{ data?.stats?.maxGpuScore?.toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div>
          <div class="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 font-bold">
            <Cpu class="w-3.5 h-3.5" />
            <span>Total CPUs Indexés</span>
          </div>
          <div class="text-2xl font-black text-white font-mono mt-1">
            {{ data?.stats?.totalCpus?.toLocaleString() || 0 }}
          </div>
        </div>
        <div class="text-right font-mono text-[10px] text-slate-500">
          Max: <span class="text-cyan-300 font-bold">{{ data?.stats?.maxCpuScore?.toLocaleString() }}</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">Score Moyen GPU (G3D)</div>
        <div class="text-2xl font-black text-purple-300 font-mono mt-1">
          {{ data?.stats?.avgGpuScore?.toLocaleString() || 0 }} <span class="text-xs text-slate-500 font-normal">pts</span>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">Score Moyen CPU (Gaming)</div>
        <div class="text-2xl font-black text-cyan-300 font-mono mt-1">
          {{ data?.stats?.avgCpuScore?.toLocaleString() || 0 }} <span class="text-xs text-slate-500 font-normal">pts</span>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            :value="searchInput"
            @input="onSearchChange(($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Rechercher par nom exact, clé normalisée (ex: RTX 4080, 7800X3D, GTX 1060, i7-14700K)..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 text-xs text-white placeholder-slate-500 font-mono"
          />
        </div>

        <!-- Type Selector Tabs -->
        <div class="flex p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            @click="selectedType = 'all'; currentPage = 1"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            :class="selectedType === 'all' ? 'bg-slate-800 text-white font-bold shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            Tous ({{ (data?.stats?.totalGpus || 0) + (data?.stats?.totalCpus || 0) }})
          </button>
          <button
            @click="selectedType = 'gpu'; currentPage = 1"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="selectedType === 'gpu' ? 'bg-purple-950/80 text-purple-300 font-bold border border-purple-800' : 'text-slate-400 hover:text-slate-200'"
          >
            <Monitor class="w-3.5 h-3.5" />
            <span>GPUs ({{ data?.stats?.totalGpus || 0 }})</span>
          </button>
          <button
            @click="selectedType = 'cpu'; currentPage = 1"
            class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="selectedType === 'cpu' ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-800' : 'text-slate-400 hover:text-slate-200'"
          >
            <Cpu class="w-3.5 h-3.5" />
            <span>CPUs ({{ data?.stats?.totalCpus || 0 }})</span>
          </button>
        </div>
      </div>

      <!-- Secondary Filters & Sorts -->
      <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-slate-400 text-[11px] flex items-center gap-1">
            <Filter class="w-3 h-3 text-slate-500" />
            <span>Filtrer par Tier :</span>
          </span>
          <button
            @click="selectedTier = ''; currentPage = 1"
            class="px-2 py-1 rounded-md border text-[10px] transition-all cursor-pointer"
            :class="selectedTier === '' ? 'bg-slate-800 border-slate-600 text-white font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'"
          >
            Tous Tiers
          </button>
          <button
            v-for="t in [5, 4, 3, 2, 1]"
            :key="t"
            @click="selectedTier = t; currentPage = 1"
            class="px-2 py-1 rounded-md border text-[10px] transition-all cursor-pointer"
            :class="selectedTier === t ? getTierBadgeClass(t) + ' font-bold' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'"
          >
            Tier {{ t }}
          </button>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>Trier par :</span>
            <select
              v-model="sortBy"
              class="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 cursor-pointer"
            >
              <option value="score">Score Benchmark</option>
              <option value="name">Nom Alphabétique</option>
              <option value="tier">Niveau de Tier</option>
            </select>
          </div>

          <button
            @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
            class="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer"
          >
            {{ sortOrder === 'desc' ? '↓ Décroissant' : '↑ Croissant' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Table of Components -->
    <div class="cyber-card border-slate-800 overflow-hidden shadow-2xl">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
              <th class="p-4 w-28">Type</th>
              <th class="p-4">Composant & Clé Normalisée</th>
              <th class="p-4 w-48 text-right">Score PassMark</th>
              <th class="p-4 w-44">Tier Matériel</th>
              <th class="p-4 w-24 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-800/60 font-mono text-xs">
            <tr
              v-for="item in data?.items || []"
              :key="item.id"
              class="hover:bg-slate-900/60 transition-colors group"
            >
              <!-- Type Badge -->
              <td class="p-4">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border"
                  :class="
                    item.type === 'gpu'
                      ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                      : 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                  "
                >
                  <component :is="item.type === 'gpu' ? Monitor : Cpu" class="w-3 h-3" />
                  <span>{{ item.type.toUpperCase() }}</span>
                </span>
              </td>

              <!-- Name & Key -->
              <td class="p-4">
                <div class="font-bold text-sm text-white group-hover:text-brand-300 transition-colors font-sans">
                  {{ item.name }}
                </div>
                <div class="text-[11px] text-slate-500 font-mono mt-0.5">
                  normalized: <span class="text-slate-400">{{ item.normalized }}</span>
                </div>
              </td>

              <!-- Score -->
              <td class="p-4 text-right">
                <div
                  class="font-black text-sm"
                  :class="item.type === 'gpu' ? 'text-purple-300' : 'text-cyan-300'"
                >
                  {{ item.score.toLocaleString() }} <span class="text-[10px] text-slate-500 font-normal">pts</span>
                </div>
                <!-- Mini Progress bar -->
                <div class="w-full bg-slate-950 rounded-full h-1 mt-1.5 overflow-hidden border border-slate-800">
                  <div
                    class="h-full rounded-full"
                    :class="item.type === 'gpu' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'"
                    :style="{
                      width: `${Math.min(100, (item.score / (item.type === 'gpu' ? (data?.stats?.maxGpuScore || 40000) : (data?.stats?.maxCpuScore || 5000))) * 100)}%`
                    }"
                  />
                </div>
              </td>

              <!-- Tier -->
              <td class="p-4">
                <span
                  class="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border"
                  :class="getTierBadgeClass(item.tier)"
                >
                  {{ getTierLabel(item.tier) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="p-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    @click="openEditModal(item)"
                    class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Modifier le score ou le composant"
                  >
                    <Edit2 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="deleteComponent(item)"
                    class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!pending && (!data?.items || data.items.length === 0)">
              <td colspan="5" class="p-12 text-center text-slate-500 font-mono">
                Aucun composant matériel ne correspond aux critères de recherche.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-slate-400">
        <div>
          Affichage de <span class="text-white font-bold">{{ data?.items?.length || 0 }}</span> sur
          <span class="text-white font-bold">{{ data?.pagination?.total || 0 }}</span> composants
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage <= 1"
            class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            <ChevronLeft class="w-3.5 h-3.5" />
            <span>Précédent</span>
          </button>

          <span class="px-3 py-1.5 text-white font-bold bg-slate-900 border border-slate-800 rounded-lg">
            Page {{ currentPage }} / {{ data?.pagination?.totalPages || 1 }}
          </span>

          <button
            @click="currentPage = Math.min(data?.pagination?.totalPages || 1, currentPage + 1)"
            :disabled="currentPage >= (data?.pagination?.totalPages || 1)"
            class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
          >
            <span>Suivant</span>
            <ChevronRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal d'Ajout / Édition de Composant -->
    <Teleport to="body">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        @click.self="isModalOpen = false"
      >
        <div class="cyber-card w-full max-w-lg p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
              <Sparkles class="w-4 h-4 text-purple-400" />
              <span>{{ editingItem ? 'Modifier le Benchmark Composant' : 'Ajouter un Composant Matériel' }}</span>
            </h3>
            <button
              @click="isModalOpen = false"
              class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveComponent" class="mt-4 space-y-4">
            <div v-if="modalError" class="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {{ modalError }}
            </div>

            <!-- Type -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Type de Composant
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  @click="modalForm.type = 'gpu'"
                  :disabled="!!editingItem"
                  class="py-2 rounded-lg border text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  :class="modalForm.type === 'gpu' ? 'bg-purple-950 border-purple-600 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-400'"
                >
                  <Monitor class="w-4 h-4" />
                  <span>Carte Graphique (GPU)</span>
                </button>
                <button
                  type="button"
                  @click="modalForm.type = 'cpu'"
                  :disabled="!!editingItem"
                  class="py-2 rounded-lg border text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer"
                  :class="modalForm.type === 'cpu' ? 'bg-cyan-950 border-cyan-600 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400'"
                >
                  <Cpu class="w-4 h-4" />
                  <span>Processeur (CPU)</span>
                </button>
              </div>
            </div>

            <!-- Name -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Nom du Composant *
              </label>
              <input
                v-model="modalForm.name"
                type="text"
                placeholder="Ex: NVIDIA GeForce RTX 4080 SUPER, AMD Ryzen 7 7800X3D..."
                required
                class="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono"
              />
            </div>

            <!-- Score -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Score PassMark {{ modalForm.type === 'gpu' ? 'G3D Mark' : 'Gaming CPU Mark' }} *
              </label>
              <input
                v-model.number="modalForm.score"
                type="number"
                min="1"
                step="1"
                required
                class="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-brand-300 font-mono font-bold"
              />
            </div>

            <!-- Tier -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Tier (1 à 5)
              </label>
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="t in [1, 2, 3, 4, 5]"
                  :key="t"
                  type="button"
                  @click="modalForm.tier = t"
                  class="py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer"
                  :class="modalForm.tier === t ? getTierBadgeClass(t) : 'bg-slate-950 border-slate-800 text-slate-400'"
                >
                  T{{ t }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                @click="isModalOpen = false"
                class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <span v-if="isSubmitting">Enregistrement...</span>
                <span v-else>{{ editingItem ? 'Mettre à jour' : 'Enregistrer le composant' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
