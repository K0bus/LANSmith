<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Search,
  Gamepad2,
  Sparkles,
  X,
  Plus,
  Check,
  Monitor,
  Cpu,
  HardDrive,
  Sliders,
  Layers,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-vue-next'
import type { IgdbGameSearchResult } from '~/server/utils/igdb'

const props = defineProps<{
  isOpen: boolean
  gameToEdit?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const activeTab = ref<'search' | 'hardware'>('search')
const searchQuery = ref('')
const searchResults = ref<IgdbGameSearchResult[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)

const selectedIgdbGame = ref<IgdbGameSearchResult | null>(null)

const form = ref({
  id: '',
  igdbId: null as number | null,
  name: '',
  slug: '',
  coverUrl: '',
  genres: '',
  summary: '',
  minCpuName: 'Intel Core i5-7400',
  minCpuScore: 2000,
  recCpuName: 'AMD Ryzen 5 5600X',
  recCpuScore: 3400,
  minGpuName: 'NVIDIA GeForce GTX 1060',
  minGpuScore: 10000,
  recGpuName: 'NVIDIA GeForce RTX 3060',
  recGpuScore: 17100,
  minRamGb: 8,
  recRamGb: 16,
  minVramGb: 3,
  recVramGb: 6
})

const isSubmitting = ref(false)
const errorMessage = ref('')

// Hardware autocomplete search state
const minGpuQuery = ref('')
const minGpuSuggestions = ref<any[]>([])
const showMinGpuDropdown = ref(false)

const recGpuQuery = ref('')
const recGpuSuggestions = ref<any[]>([])
const showRecGpuDropdown = ref(false)

const minCpuQuery = ref('')
const minCpuSuggestions = ref<any[]>([])
const showMinCpuDropdown = ref(false)

const recCpuQuery = ref('')
const recCpuSuggestions = ref<any[]>([])
const showRecCpuDropdown = ref(false)

let debounceTimer: any = null

function searchHardware(
  query: string,
  type: 'gpu' | 'cpu',
  target: 'minGpu' | 'recGpu' | 'minCpu' | 'recCpu'
) {
  clearTimeout(debounceTimer)
  if (!query.trim()) {
    if (target === 'minGpu') { minGpuSuggestions.value = []; showMinGpuDropdown.value = false }
    if (target === 'recGpu') { recGpuSuggestions.value = []; showRecGpuDropdown.value = false }
    if (target === 'minCpu') { minCpuSuggestions.value = []; showMinCpuDropdown.value = false }
    if (target === 'recCpu') { recCpuSuggestions.value = []; showRecCpuDropdown.value = false }
    return
  }

  debounceTimer = setTimeout(async () => {
    try {
      const data: any = await $fetch('/api/hardware/search', {
        params: { q: query, type, limit: 6 }
      })
      if (target === 'minGpu') {
        minGpuSuggestions.value = data.gpus || []
        showMinGpuDropdown.value = minGpuSuggestions.value.length > 0
      } else if (target === 'recGpu') {
        recGpuSuggestions.value = data.gpus || []
        showRecGpuDropdown.value = recGpuSuggestions.value.length > 0
      } else if (target === 'minCpu') {
        minCpuSuggestions.value = data.cpus || []
        showMinCpuDropdown.value = minCpuSuggestions.value.length > 0
      } else if (target === 'recCpu') {
        recCpuSuggestions.value = data.cpus || []
        showRecCpuDropdown.value = recCpuSuggestions.value.length > 0
      }
    } catch {
      // ignore
    }
  }, 200)
}

function selectMinGpu(gpu: { name: string; score: number }) {
  form.value.minGpuName = gpu.name
  form.value.minGpuScore = gpu.score
  minGpuQuery.value = gpu.name
  showMinGpuDropdown.value = false
}

function selectRecGpu(gpu: { name: string; score: number }) {
  form.value.recGpuName = gpu.name
  form.value.recGpuScore = gpu.score
  recGpuQuery.value = gpu.name
  showRecGpuDropdown.value = false
}

function selectMinCpu(cpu: { name: string; score: number }) {
  form.value.minCpuName = cpu.name
  form.value.minCpuScore = cpu.score
  minCpuQuery.value = cpu.name
  showMinCpuDropdown.value = false
}

function selectRecCpu(cpu: { name: string; score: number }) {
  form.value.recCpuName = cpu.name
  form.value.recCpuScore = cpu.score
  recCpuQuery.value = cpu.name
  showRecCpuDropdown.value = false
}

function applyPreset(presetType: 'light' | 'competitive' | 'heavy') {
  if (presetType === 'light') {
    form.value.minGpuName = 'NVIDIA GeForce GT 1030'
    form.value.minGpuScore = 2500
    form.value.recGpuName = 'NVIDIA GeForce GTX 1050 Ti'
    form.value.recGpuScore = 6300
    form.value.minCpuName = 'Intel Core i3-8100'
    form.value.minCpuScore = 1800
    form.value.recCpuName = 'AMD Ryzen 5 3600'
    form.value.recCpuScore = 2580
    form.value.minRamGb = 4
    form.value.recRamGb = 8
    form.value.minVramGb = 1
    form.value.recVramGb = 2
  } else if (presetType === 'competitive') {
    form.value.minGpuName = 'NVIDIA GeForce GTX 1060'
    form.value.minGpuScore = 10022
    form.value.recGpuName = 'NVIDIA GeForce RTX 3060'
    form.value.recGpuScore = 17100
    form.value.minCpuName = 'Intel Core i5-10400F'
    form.value.minCpuScore = 2500
    form.value.recCpuName = 'AMD Ryzen 5 5600X'
    form.value.recCpuScore = 3380
    form.value.minRamGb = 8
    form.value.recRamGb = 16
    form.value.minVramGb = 3
    form.value.recVramGb = 6
  } else if (presetType === 'heavy') {
    form.value.minGpuName = 'NVIDIA GeForce GTX 1660 SUPER'
    form.value.minGpuScore = 12700
    form.value.recGpuName = 'NVIDIA GeForce RTX 4070'
    form.value.recGpuScore = 26857
    form.value.minCpuName = 'Intel Core i5-12400F'
    form.value.minCpuScore = 3520
    form.value.recCpuName = 'AMD Ryzen 7 7800X3D'
    form.value.recCpuScore = 9835
    form.value.minRamGb = 12
    form.value.recRamGb = 16
    form.value.minVramGb = 6
    form.value.recVramGb = 10
  }
  minGpuQuery.value = form.value.minGpuName
  recGpuQuery.value = form.value.recGpuName
  minCpuQuery.value = form.value.minCpuName
  recCpuQuery.value = form.value.recCpuName
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = ''
      if (props.gameToEdit) {
        activeTab.value = 'hardware'
        const g = props.gameToEdit
        form.value = {
          id: g.id,
          name: g.name || '',
          slug: g.slug || '',
          igdbId: g.igdbId || null,
          coverUrl: g.coverUrl || '',
          genres: g.genres || '',
          summary: g.summary || '',
          minCpuName: 'CPU Minimal Requis',
          minCpuScore: g.minCpuScore || 2000,
          recCpuName: 'CPU Recommandé',
          recCpuScore: g.recCpuScore || 3500,
          minGpuName: 'GPU Minimal Requis',
          minGpuScore: g.minGpuScore || 8000,
          recGpuName: 'GPU Recommandé',
          recGpuScore: g.recGpuScore || 16000,
          minRamGb: g.minRamGb || 8,
          recRamGb: g.recRamGb || 16,
          minVramGb: g.minVramGb || 2,
          recVramGb: g.recVramGb || 6
        }
        minGpuQuery.value = form.value.minGpuName
        recGpuQuery.value = form.value.recGpuName
        minCpuQuery.value = form.value.minCpuName
        recCpuQuery.value = form.value.recCpuName
      } else {
        activeTab.value = 'search'
        searchQuery.value = ''
        searchResults.value = []
        hasSearched.value = false
        form.value = {
          id: '',
          name: '',
          slug: '',
          igdbId: null,
          coverUrl: '',
          genres: '',
          summary: '',
          minCpuName: 'Intel Core i5-7400',
          minCpuScore: 2000,
          recCpuName: 'AMD Ryzen 5 5600X',
          recCpuScore: 3380,
          minGpuName: 'NVIDIA GeForce GTX 1060',
          minGpuScore: 10022,
          recGpuName: 'NVIDIA GeForce RTX 3060',
          recGpuScore: 17100,
          minRamGb: 8,
          recRamGb: 16,
          minVramGb: 3,
          recVramGb: 6
        }
        minGpuQuery.value = form.value.minGpuName
        recGpuQuery.value = form.value.recGpuName
        minCpuQuery.value = form.value.minCpuName
        recCpuQuery.value = form.value.recCpuName
        triggerSearch('')
      }
    }
  }
)

async function triggerSearch(q: string) {
  isSearching.value = true
  hasSearched.value = true
  try {
    const res = await $fetch<{ results: IgdbGameSearchResult[] }>(
      `/api/games/search?q=${encodeURIComponent(q)}`
    )
    searchResults.value = res.results || []
  } catch (err) {
    console.error('Error searching IGDB:', err)
  } finally {
    isSearching.value = false
  }
}

function selectIgdbResult(game: IgdbGameSearchResult) {
  selectedIgdbGame.value = game
  form.value = {
    id: '',
    name: game.name,
    slug: game.slug || game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    igdbId: game.id,
    coverUrl: game.coverUrl || '',
    genres: game.genres || '',
    summary: game.summary || '',
    minCpuName: game.rawRequirements?.minCpu || 'CPU Min (Estimé)',
    minCpuScore: game.minCpuScore || 2000,
    recCpuName: game.rawRequirements?.recCpu || 'CPU Rec (Estimé)',
    recCpuScore: game.recCpuScore || 3800,
    minGpuName: game.rawRequirements?.minGpu || 'GPU Min (Estimé)',
    minGpuScore: game.minGpuScore || 8000,
    recGpuName: game.rawRequirements?.recGpu || 'GPU Rec (Estimé)',
    recGpuScore: game.recGpuScore || 16000,
    minRamGb: game.minRamGb || 8,
    recRamGb: game.recRamGb || 16,
    minVramGb: game.minVramGb || 2,
    recVramGb: game.recVramGb || 6
  }
  minGpuQuery.value = form.value.minGpuName
  recGpuQuery.value = form.value.recGpuName
  minCpuQuery.value = form.value.minCpuName
  recCpuQuery.value = form.value.recCpuName
  activeTab.value = 'hardware'
}

async function submitForm() {
  if (!form.value.name.trim()) {
    errorMessage.value = 'Le nom du jeu est obligatoire.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      name: form.value.name.trim(),
      slug: form.value.slug.trim() || form.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      igdbId: form.value.igdbId ? Number(form.value.igdbId) : undefined,
      coverUrl: form.value.coverUrl?.trim() || null,
      summary: form.value.summary?.trim() || null,
      minCpuScore: Number(form.value.minCpuScore) || 0,
      recCpuScore: Number(form.value.recCpuScore) || 0,
      minGpuScore: Number(form.value.minGpuScore) || 0,
      recGpuScore: Number(form.value.recGpuScore) || 0,
      minRamGb: Number(form.value.minRamGb) || 8,
      recRamGb: Number(form.value.recRamGb) || 16,
      minVramGb: Number(form.value.minVramGb) || 2,
      recVramGb: Number(form.value.recVramGb) || 6
    }

    if (props.gameToEdit?.id) {
      await $fetch(`/api/games/${props.gameToEdit.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await $fetch('/api/games', {
        method: 'POST',
        body: payload
      })
    }

    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de l’enregistrement du jeu.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      @click.self="emit('close')"
    >
      <div
        class="cyber-card w-full max-w-4xl p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative my-8"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <Gamepad2 class="w-5 h-5 text-cyan-400" />
              <span>{{ gameToEdit ? 'Modifier les spécifications du jeu' : 'Ajouter un Jeu au Catalogue' }}</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Consultation des données IGDB & Matching matériel assisté par les scores de benchmark
            </p>
          </div>
          <button
            @click="emit('close')"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex gap-2 mt-4 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            @click="activeTab = 'search'"
            class="flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            :class="
              activeTab === 'search'
                ? 'bg-slate-800 text-cyan-300 shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            "
          >
            <Search class="w-4 h-4" />
            <span>1. Rechercher sur IGDB / Presets</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'hardware'"
            class="flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            :class="
              activeTab === 'hardware'
                ? 'bg-slate-800 text-brand-300 shadow font-bold'
                : 'text-slate-400 hover:text-slate-200'
            "
          >
            <Sliders class="w-4 h-4" />
            <span>2. Matching Matériel & Exigences (Admin)</span>
          </button>
        </div>

        <!-- TAB 1: IGDB SEARCH & PRESETS -->
        <div v-if="activeTab === 'search'" class="mt-5 space-y-4">
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                v-model="searchQuery"
                @keyup.enter="triggerSearch(searchQuery)"
                type="text"
                placeholder="Rechercher un jeu (ex: Counter-Strike 2, TrackMania, Rocket League, Cyberpunk...)"
                class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-white placeholder-slate-500"
              />
            </div>
            <button
              @click="triggerSearch(searchQuery)"
              :disabled="isSearching"
              class="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span v-if="isSearching">Recherche...</span>
              <span v-else>Rechercher</span>
            </button>
          </div>

          <!-- Results Grid -->
          <div class="max-h-[440px] overflow-y-auto pr-1 space-y-3">
            <div
              v-for="game in searchResults"
              :key="game.id"
              @click="selectIgdbResult(game)"
              class="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 flex items-start gap-3.5 cursor-pointer transition-all group"
            >
              <img
                :src="game.coverUrl || 'https://placehold.co/100x140/0f172a/38bdf8?text=Jeu'"
                class="w-14 h-20 object-cover rounded-lg bg-slate-900 border border-slate-800 shrink-0 shadow"
                alt="cover"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">
                      {{ game.name }}
                    </h4>
                    <span class="text-[11px] text-cyan-400/80 font-mono">{{ game.genres }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span
                      v-if="game.steamAppId"
                      class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-800"
                    >
                      Steam #{{ game.steamAppId }}
                    </span>
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                      :class="
                        game.source === 'IGDB'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      "
                    >
                      {{ game.source === 'IGDB' ? 'IGDB API' : 'Preset LAN' }}
                    </span>
                  </div>
                </div>

                <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {{ game.summary }}
                </p>

                <!-- Steam System Requirements snippet if present -->
                <div
                  v-if="game.rawRequirements?.minCpu || game.rawRequirements?.minGpu"
                  class="mt-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] font-mono space-y-1"
                >
                  <div class="text-blue-400 font-bold text-[10px] uppercase flex items-center gap-1">
                    <span>⚡ Prérequis Steam Détectés & Calibrés :</span>
                  </div>
                  <div class="text-slate-300 text-[10px] truncate">
                    <span class="text-slate-500">Min:</span> {{ game.rawRequirements.minCpu || 'N/A' }} | {{ game.rawRequirements.minGpu || 'N/A' }} ({{ game.rawRequirements.minRamGb || game.minRamGb }} Go RAM)
                  </div>
                </div>

                <div class="mt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
                  <span class="text-purple-300">GPU : {{ game.minGpuScore }} pts</span>
                  <span class="text-cyan-300">CPU : {{ game.minCpuScore }} pts</span>
                  <span class="text-emerald-300">RAM : {{ game.minRamGb }} Go</span>
                  <span class="ml-auto text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                    Sélectionner & Matcher →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: HARDWARE MATCHING (ADMIN) -->
        <form v-else @submit.prevent="submitForm" class="mt-5 space-y-6">
          <div v-if="errorMessage" class="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {{ errorMessage }}
          </div>

          <!-- Section A : Fiche IGDB & Informations Générales -->
          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row gap-4">
            <img
              :src="form.coverUrl || 'https://placehold.co/100x140/0f172a/38bdf8?text=Jeu'"
              class="w-20 h-28 object-cover rounded-xl bg-slate-900 border border-slate-700 shadow shrink-0 self-center md:self-start"
              alt="cover"
            />

            <div class="flex-1 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Titre du jeu *</label>
                  <input
                    v-model="form.name"
                    type="text"
                    required
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Identifiant IGDB</label>
                  <input
                    v-model.number="form.igdbId"
                    type="number"
                    placeholder="Ex: 247854"
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-purple-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
                  <Info class="w-3.5 h-3.5 text-cyan-400" />
                  <span>Données & Description rédigées dans IGDB :</span>
                </label>
                <textarea
                  v-model="form.summary"
                  rows="2"
                  class="w-full px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300"
                  placeholder="Texte descriptif ou prérequis mentionnés sur la fiche IGDB..."
                />
              </div>
            </div>
          </div>

          <!-- Quick Presets for Admins -->
          <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span class="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-brand-400" />
              <span>Presets Rapides de Profils :</span>
            </span>
            <div class="flex gap-2">
              <button
                type="button"
                @click="applyPreset('light')"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-emerald-300 cursor-pointer"
              >
                Esport / Léger
              </button>
              <button
                type="button"
                @click="applyPreset('competitive')"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-cyan-300 cursor-pointer"
              >
                Compétitif 144Hz
              </button>
              <button
                type="button"
                @click="applyPreset('heavy')"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-purple-300 cursor-pointer"
              >
                AAA Gourmand
              </button>
            </div>
          </div>

          <!-- Section B : Spécifications MINIMALES (Matching avec Benchmarks) -->
          <div class="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sliders class="w-4 h-4 text-amber-400" />
                <span>1. Spécifications Minimales Requises (Plancher 720p/1080p Bas)</span>
              </h4>
              <span class="text-[10px] font-mono text-slate-400">Score & Composants de référence</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Min GPU Matching -->
              <div class="space-y-1.5 relative">
                <label class="block text-xs text-slate-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5 font-semibold">
                    <Monitor class="w-3.5 h-3.5 text-purple-400" />
                    <span>GPU Minimum Requis</span>
                  </span>
                  <span class="text-purple-300 font-mono font-bold">{{ form.minGpuScore }} pts</span>
                </label>
                <div class="relative">
                  <input
                    v-model="minGpuQuery"
                    @input="searchHardware(($event.target as HTMLInputElement).value, 'gpu', 'minGpu')"
                    @focus="showMinGpuDropdown = minGpuSuggestions.length > 0"
                    type="text"
                    placeholder="Matcher un GPU (ex: GTX 1060, GT 1030, RX 580...)"
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <!-- Dropdown -->
                  <div
                    v-if="showMinGpuDropdown && minGpuSuggestions.length > 0"
                    class="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-800"
                  >
                    <div
                      v-for="g in minGpuSuggestions"
                      :key="g.id"
                      @click="selectMinGpu(g)"
                      class="p-2 hover:bg-purple-950/40 cursor-pointer flex items-center justify-between"
                    >
                      <span class="text-xs text-white">{{ g.name }}</span>
                      <span class="text-[10px] font-mono text-purple-300 font-bold">{{ g.score }} pts (T{{ g.tier }})</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-0.5">
                  <span class="text-[10px] text-slate-500 font-mono">Score exact :</span>
                  <input
                    v-model.number="form.minGpuScore"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-purple-300 font-mono"
                  />
                </div>
              </div>

              <!-- Min CPU Matching -->
              <div class="space-y-1.5 relative">
                <label class="block text-xs text-slate-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5 font-semibold">
                    <Cpu class="w-3.5 h-3.5 text-cyan-400" />
                    <span>CPU Minimum Requis</span>
                  </span>
                  <span class="text-cyan-300 font-mono font-bold">{{ form.minCpuScore }} pts</span>
                </label>
                <div class="relative">
                  <input
                    v-model="minCpuQuery"
                    @input="searchHardware(($event.target as HTMLInputElement).value, 'cpu', 'minCpu')"
                    @focus="showMinCpuDropdown = minCpuSuggestions.length > 0"
                    type="text"
                    placeholder="Matcher un CPU (ex: i3-8100, i5-7400, Ryzen 5 2600...)"
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <!-- Dropdown -->
                  <div
                    v-if="showMinCpuDropdown && minCpuSuggestions.length > 0"
                    class="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-800"
                  >
                    <div
                      v-for="c in minCpuSuggestions"
                      :key="c.id"
                      @click="selectMinCpu(c)"
                      class="p-2 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between"
                    >
                      <span class="text-xs text-white">{{ c.name }}</span>
                      <span class="text-[10px] font-mono text-cyan-300 font-bold">{{ c.score }} pts (T{{ c.tier }})</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-0.5">
                  <span class="text-[10px] text-slate-500 font-mono">Score exact :</span>
                  <input
                    v-model.number="form.minCpuScore"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Min RAM & VRAM -->
            <div class="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label class="block text-xs font-mono text-slate-400 mb-1">RAM Minimum : {{ form.minRamGb }} Go</label>
                <div class="flex gap-1">
                  <button
                    v-for="r in [2, 4, 8, 12, 16]"
                    :key="r"
                    type="button"
                    @click="form.minRamGb = r"
                    class="flex-1 py-1 text-xs font-mono rounded border transition-all"
                    :class="form.minRamGb === r ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  >
                    {{ r }}G
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-mono text-slate-400 mb-1">VRAM Minimum : {{ form.minVramGb }} Go</label>
                <div class="flex gap-1">
                  <button
                    v-for="v in [1, 2, 3, 4, 6, 8]"
                    :key="v"
                    type="button"
                    @click="form.minVramGb = v"
                    class="flex-1 py-1 text-xs font-mono rounded border transition-all"
                    :class="form.minVramGb === v ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  >
                    {{ v }}G
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Section C : Spécifications RECOMMANDÉES (Optimal 1080p/1440p) -->
          <div class="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 class="w-4 h-4 text-emerald-400" />
                <span>2. Spécifications Recommandées (Optimal 1080p Élevé / 1440p)</span>
              </h4>
              <span class="text-[10px] font-mono text-slate-400">Score de confort & fluidité</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Rec GPU Matching -->
              <div class="space-y-1.5 relative">
                <label class="block text-xs text-slate-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5 font-semibold">
                    <Monitor class="w-3.5 h-3.5 text-purple-400" />
                    <span>GPU Recommandé</span>
                  </span>
                  <span class="text-purple-300 font-mono font-bold">{{ form.recGpuScore }} pts</span>
                </label>
                <div class="relative">
                  <input
                    v-model="recGpuQuery"
                    @input="searchHardware(($event.target as HTMLInputElement).value, 'gpu', 'recGpu')"
                    @focus="showRecGpuDropdown = recGpuSuggestions.length > 0"
                    type="text"
                    placeholder="Matcher un GPU (ex: RTX 3060, RTX 4070, RX 7800 XT...)"
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <!-- Dropdown -->
                  <div
                    v-if="showRecGpuDropdown && recGpuSuggestions.length > 0"
                    class="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-800"
                  >
                    <div
                      v-for="g in recGpuSuggestions"
                      :key="g.id"
                      @click="selectRecGpu(g)"
                      class="p-2 hover:bg-purple-950/40 cursor-pointer flex items-center justify-between"
                    >
                      <span class="text-xs text-white">{{ g.name }}</span>
                      <span class="text-[10px] font-mono text-purple-300 font-bold">{{ g.score }} pts (T{{ g.tier }})</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-0.5">
                  <span class="text-[10px] text-slate-500 font-mono">Score exact :</span>
                  <input
                    v-model.number="form.recGpuScore"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-purple-300 font-mono"
                  />
                </div>
              </div>

              <!-- Rec CPU Matching -->
              <div class="space-y-1.5 relative">
                <label class="block text-xs text-slate-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5 font-semibold">
                    <Cpu class="w-3.5 h-3.5 text-cyan-400" />
                    <span>CPU Recommandé</span>
                  </span>
                  <span class="text-cyan-300 font-mono font-bold">{{ form.recCpuScore }} pts</span>
                </label>
                <div class="relative">
                  <input
                    v-model="recCpuQuery"
                    @input="searchHardware(($event.target as HTMLInputElement).value, 'cpu', 'recCpu')"
                    @focus="showRecCpuDropdown = recCpuSuggestions.length > 0"
                    type="text"
                    placeholder="Matcher un CPU (ex: Ryzen 5 5600X, i5-13600K, 7800X3D...)"
                    class="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                  />
                  <!-- Dropdown -->
                  <div
                    v-if="showRecCpuDropdown && recCpuSuggestions.length > 0"
                    class="absolute z-30 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-800"
                  >
                    <div
                      v-for="c in recCpuSuggestions"
                      :key="c.id"
                      @click="selectRecCpu(c)"
                      class="p-2 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between"
                    >
                      <span class="text-xs text-white">{{ c.name }}</span>
                      <span class="text-[10px] font-mono text-cyan-300 font-bold">{{ c.score }} pts (T{{ c.tier }})</span>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-0.5">
                  <span class="text-[10px] text-slate-500 font-mono">Score exact :</span>
                  <input
                    v-model.number="form.recCpuScore"
                    type="number"
                    min="0"
                    step="1"
                    class="w-28 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Rec RAM & VRAM -->
            <div class="grid grid-cols-2 gap-4 pt-1">
              <div>
                <label class="block text-xs font-mono text-slate-400 mb-1">RAM Recommandée : {{ form.recRamGb }} Go</label>
                <div class="flex gap-1">
                  <button
                    v-for="r in [4, 8, 16, 32]"
                    :key="r"
                    type="button"
                    @click="form.recRamGb = r"
                    class="flex-1 py-1 text-xs font-mono rounded border transition-all"
                    :class="form.recRamGb === r ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  >
                    {{ r }}G
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-xs font-mono text-slate-400 mb-1">VRAM Recommandée : {{ form.recVramGb }} Go</label>
                <div class="flex gap-1">
                  <button
                    v-for="v in [2, 4, 6, 8, 12, 16]"
                    :key="v"
                    type="button"
                    @click="form.recVramGb = v"
                    class="flex-1 py-1 text-xs font-mono rounded border transition-all"
                    :class="form.recVramGb === v ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  >
                    {{ v }}G
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              @click="activeTab = 'search'"
              class="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              ← Retour à la recherche
            </button>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-glow-cyan transition-all disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmitting">Enregistrement...</span>
              <span v-else>{{ gameToEdit ? 'Mettre à jour le jeu' : 'Valider & Enregistrer le jeu' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
