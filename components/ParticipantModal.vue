<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Monitor,
  Cpu,
  Sparkles,
  X,
  User,
  Search,
  Check,
  Zap,
  Gauge,
  Layers,
  Activity
} from 'lucide-vue-next'

const props = defineProps<{
  isOpen: boolean
  participantToEdit?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const form = ref({
  nickname: '',
  avatarUrl: '',
  cpuName: 'AMD Ryzen 7 7800X3D',
  cpuScore: 9835,
  gpuName: 'NVIDIA GeForce RTX 4070',
  gpuScore: 26857,
  vramGb: 12,
  ramGb: 32,
  os: 'Windows 11'
})

const isSubmitting = ref(false)
const errorMessage = ref('')

// Autocompletion state for GPU
const gpuSearchInput = ref('')
const gpuSuggestions = ref<any[]>([])
const isSearchingGpu = ref(false)
const showGpuDropdown = ref(false)

// Autocompletion state for CPU
const cpuSearchInput = ref('')
const cpuSuggestions = ref<any[]>([])
const isSearchingCpu = ref(false)
const showCpuDropdown = ref(false)

// Debounce timer helpers
let gpuDebounceTimer: any = null
let cpuDebounceTimer: any = null

function getGpuTier(score: number): number {
  if (score >= 20000) return 5
  if (score >= 12000) return 4
  if (score >= 6000) return 3
  if (score >= 3500) return 2
  return 1
}

function getCpuTier(score: number): number {
  if (score >= 4200) return 5
  if (score >= 3400) return 4
  if (score >= 2700) return 3
  if (score >= 2000) return 2
  return 1
}

const currentGpuTier = computed(() => getGpuTier(form.value.gpuScore))
const currentCpuTier = computed(() => getCpuTier(form.value.cpuScore))

const avatarPreview = computed(() => {
  if (form.value.avatarUrl) return form.value.avatarUrl
  const seed = form.value.nickname.trim() || 'LAN_Player'
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`
})

const QUICK_GPUS = [
  { name: 'GeForce RTX 4080', score: 34431, vram: 16 },
  { name: 'GeForce RTX 4070 SUPER', score: 29945, vram: 12 },
  { name: 'Radeon RX 7800 XT', score: 24200, vram: 16 },
  { name: 'GeForce RTX 3060', score: 17100, vram: 12 },
  { name: 'GeForce GTX 1060', score: 10022, vram: 6 }
]

const QUICK_CPUS = [
  { name: 'AMD Ryzen 7 7800X3D', score: 9835 },
  { name: 'Intel Core i7-14700K', score: 6319 },
  { name: 'Intel Core i5-13600K', score: 4320 },
  { name: 'AMD Ryzen 5 5600X', score: 3380 },
  { name: 'Intel Core i5-12400F', score: 3520 }
]

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      errorMessage.value = ''
      showGpuDropdown.value = false
      showCpuDropdown.value = false

      if (props.participantToEdit) {
        const p = props.participantToEdit
        form.value = {
          nickname: p.nickname || p.name || '',
          avatarUrl: p.avatarUrl || p.avatar || '',
          cpuName: p.rig?.cpuName || p.rig?.cpuModel || 'AMD Ryzen 7 7800X3D',
          cpuScore: p.rig?.cpuScore || 9835,
          gpuName: p.rig?.gpuName || p.rig?.gpuModel || 'NVIDIA GeForce RTX 4070',
          gpuScore: p.rig?.gpuScore || 26857,
          vramGb: p.rig?.vramGb || 12,
          ramGb: p.rig?.ramGb || 32,
          os: p.rig?.os || 'Windows 11'
        }
      } else {
        form.value = {
          nickname: '',
          avatarUrl: '',
          cpuName: 'AMD Ryzen 7 7800X3D',
          cpuScore: 9835,
          gpuName: 'NVIDIA GeForce RTX 4070',
          gpuScore: 26857,
          vramGb: 12,
          ramGb: 32,
          os: 'Windows 11'
        }
      }
      gpuSearchInput.value = form.value.gpuName
      cpuSearchInput.value = form.value.cpuName
    }
  }
)

// Search GPU benchmarks
function onGpuInput(val: string) {
  form.value.gpuName = val
  clearTimeout(gpuDebounceTimer)
  if (!val.trim()) {
    gpuSuggestions.value = []
    showGpuDropdown.value = false
    return
  }

  isSearchingGpu.value = true
  gpuDebounceTimer = setTimeout(async () => {
    try {
      const data: any = await $fetch('/api/hardware/search', {
        params: { q: val, type: 'gpu', limit: 8 }
      })
      gpuSuggestions.value = data.gpus || []
      showGpuDropdown.value = gpuSuggestions.value.length > 0
    } catch {
      gpuSuggestions.value = []
    } finally {
      isSearchingGpu.value = false
    }
  }, 200)
}

function selectGpu(gpu: { name: string; score: number }) {
  form.value.gpuName = gpu.name
  form.value.gpuScore = gpu.score
  gpuSearchInput.value = gpu.name
  showGpuDropdown.value = false

  // Auto suggest VRAM
  const n = gpu.name.toLowerCase()
  if (n.includes('4090') || n.includes('7900 xtx') || n.includes('4080')) form.value.vramGb = 16
  else if (n.includes('4070') || n.includes('7800') || n.includes('6700') || n.includes('3060'))
    form.value.vramGb = 12
  else if (n.includes('3070') || n.includes('3060 ti') || n.includes('4060') || n.includes('2080') || n.includes('6600'))
    form.value.vramGb = 8
  else if (n.includes('1060') || n.includes('1660') || n.includes('580')) form.value.vramGb = 6
  else if (n.includes('1050') || n.includes('560') || n.includes('1650')) form.value.vramGb = 4
}

// Search CPU benchmarks
function onCpuInput(val: string) {
  form.value.cpuName = val
  clearTimeout(cpuDebounceTimer)
  if (!val.trim()) {
    cpuSuggestions.value = []
    showCpuDropdown.value = false
    return
  }

  isSearchingCpu.value = true
  cpuDebounceTimer = setTimeout(async () => {
    try {
      const data: any = await $fetch('/api/hardware/search', {
        params: { q: val, type: 'cpu', limit: 8 }
      })
      cpuSuggestions.value = data.cpus || []
      showCpuDropdown.value = cpuSuggestions.value.length > 0
    } catch {
      cpuSuggestions.value = []
    } finally {
      isSearchingCpu.value = false
    }
  }, 200)
}

function selectCpu(cpu: { name: string; score: number }) {
  form.value.cpuName = cpu.name
  form.value.cpuScore = cpu.score
  cpuSearchInput.value = cpu.name
  showCpuDropdown.value = false
}

async function submitForm() {
  if (!form.value.nickname.trim()) {
    errorMessage.value = 'Le pseudo du joueur est obligatoire.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      nickname: form.value.nickname.trim(),
      avatarUrl: form.value.avatarUrl.trim() || avatarPreview.value,
      cpuName: form.value.cpuName.trim(),
      cpuScore: Number(form.value.cpuScore) || 0,
      gpuName: form.value.gpuName.trim(),
      gpuScore: Number(form.value.gpuScore) || 0,
      vramGb: Number(form.value.vramGb) || 8,
      ramGb: Number(form.value.ramGb) || 16,
      os: form.value.os.trim()
    }

    if (props.participantToEdit?.id) {
      await $fetch(`/api/participants/${props.participantToEdit.id}`, {
        method: 'PUT',
        body: payload
      })
    } else {
      await $fetch('/api/participants', {
        method: 'POST',
        body: payload
      })
    }

    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la sauvegarde.'
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
        class="cyber-card w-full max-w-2xl p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative my-8"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles class="w-5 h-5 text-brand-400" />
              <span>{{
                participantToEdit ? 'Modifier la Configuration Joueur' : 'Nouveau Joueur & Machine LAN'
              }}</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">
              Évaluation hardware avec scoring PassMark et classification automatique par tiers
            </p>
          </div>
          <button
            @click="emit('close')"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="submitForm" class="mt-6 space-y-6">
          <!-- Error alert -->
          <div
            v-if="errorMessage"
            class="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs"
          >
            {{ errorMessage }}
          </div>

          <!-- Section 1 : Joueur & Profil -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div class="relative shrink-0">
              <img
                :src="avatarPreview"
                class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 p-1 shadow-inner"
                alt="Avatar"
              />
              <div
                class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-950 font-bold"
              >
                ✓
              </div>
            </div>

            <div class="flex-1 w-full space-y-3">
              <div>
                <label
                  class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1.5"
                >
                  <User class="w-3.5 h-3.5 text-brand-400" />
                  <span>Pseudo du Joueur *</span>
                </label>
                <input
                  v-model="form.nickname"
                  type="text"
                  placeholder="Ex: GhostRider, Alex, CyberNinja..."
                  required
                  class="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label class="block text-[11px] text-slate-400 mb-0.5">URL de l'avatar (optionnel) :</label>
                <input
                  v-model="form.avatarUrl"
                  type="url"
                  placeholder="Laisser vide pour un avatar généré automatiquement"
                  class="w-full px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 focus:border-brand-500 text-xs text-slate-300 placeholder-slate-600"
                />
              </div>
            </div>
          </div>

          <!-- Section 2 : Carte Graphique (GPU) -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 relative">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5"
              >
                <Monitor class="w-4 h-4 text-purple-400" />
                <span>Carte Graphique (GPU)</span>
              </span>
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-xs font-mono font-bold"
                >
                  Score : {{ form.gpuScore.toLocaleString() }} pts
                </span>
                <span
                  class="px-2 py-0.5 rounded text-xs font-mono font-bold"
                  :class="
                    currentGpuTier >= 4
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : currentGpuTier >= 3
                      ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300'
                      : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                  "
                >
                  Tier {{ currentGpuTier }}/5
                </span>
              </div>
            </div>

            <!-- GPU Search with Autocomplete -->
            <div class="relative">
              <label class="block text-[11px] text-slate-400 mb-1">
                Recherche de GPU avec base de benchmarks PassMark G3D :
              </label>
              <div class="relative">
                <input
                  v-model="gpuSearchInput"
                  @input="onGpuInput(($event.target as HTMLInputElement).value)"
                  @focus="showGpuDropdown = gpuSuggestions.length > 0"
                  type="text"
                  placeholder="Taper un modèle (ex: RTX 4070, RX 7800 XT, RTX 3060...)"
                  class="w-full pl-9 pr-24 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-purple-500 text-sm text-white font-mono"
                />
                <Search class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <span
                  v-if="isSearchingGpu"
                  class="absolute right-3 top-2.5 text-xs text-purple-400 font-mono animate-pulse"
                >
                  Recherche...
                </span>
              </div>

              <!-- GPU Suggestions Dropdown -->
              <div
                v-if="showGpuDropdown && gpuSuggestions.length > 0"
                class="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-800"
              >
                <div
                  v-for="gpu in gpuSuggestions"
                  :key="gpu.id"
                  @click="selectGpu(gpu)"
                  class="p-2.5 hover:bg-purple-950/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div class="text-xs font-bold text-white">{{ gpu.name }}</div>
                    <div class="text-[10px] text-slate-400">Score G3D : {{ gpu.score.toLocaleString() }} pts</div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 text-[10px] font-mono font-bold">
                    Tier {{ gpu.tier }}/5
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick GPU presets -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-500 font-mono">Presets :</span>
              <button
                v-for="qg in QUICK_GPUS"
                :key="qg.name"
                type="button"
                @click="selectGpu(qg)"
                class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-[11px] text-slate-300 font-mono transition-colors"
              >
                {{ qg.name }}
              </button>
            </div>

            <!-- VRAM & GPU Score Adjustment -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <div class="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>VRAM Vidéo Dédiée</span>
                  <span class="font-bold text-purple-400">{{ form.vramGb }} Go</span>
                </div>
                <div class="flex gap-1">
                  <button
                    v-for="vram in [2, 4, 6, 8, 12, 16, 24]"
                    :key="vram"
                    type="button"
                    @click="form.vramGb = vram"
                    class="flex-1 py-1 text-[11px] font-mono rounded border transition-all"
                    :class="
                      form.vramGb === vram
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    "
                  >
                    {{ vram }}G
                  </button>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Score GPU Manuel</span>
                  <span class="font-bold text-purple-400">{{ form.gpuScore }} pts</span>
                </div>
                <input
                  v-model.number="form.gpuScore"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Section 3 : Processeur (CPU) & RAM -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 relative">
            <div class="flex items-center justify-between">
              <span
                class="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5"
              >
                <Cpu class="w-4 h-4 text-cyan-400" />
                <span>Processeur (CPU) & RAM</span>
              </span>
              <div class="flex items-center gap-2">
                <span
                  class="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-mono font-bold"
                >
                  Score : {{ form.cpuScore.toLocaleString() }} pts
                </span>
                <span
                  class="px-2 py-0.5 rounded text-xs font-mono font-bold"
                  :class="
                    currentCpuTier >= 4
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                      : currentCpuTier >= 3
                      ? 'bg-cyan-950/80 border border-cyan-800 text-cyan-300'
                      : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                  "
                >
                  Tier {{ currentCpuTier }}/5
                </span>
              </div>
            </div>

            <!-- CPU Search with Autocomplete -->
            <div class="relative">
              <label class="block text-[11px] text-slate-400 mb-1">
                Recherche de CPU avec base PassMark Gaming :
              </label>
              <div class="relative">
                <input
                  v-model="cpuSearchInput"
                  @input="onCpuInput(($event.target as HTMLInputElement).value)"
                  @focus="showCpuDropdown = cpuSuggestions.length > 0"
                  type="text"
                  placeholder="Taper un modèle (ex: Ryzen 7 7800X3D, i7-14700K, i5-12400F...)"
                  class="w-full pl-9 pr-24 py-2 rounded-lg bg-slate-900 border border-slate-700 focus:border-cyan-500 text-sm text-white font-mono"
                />
                <Search class="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <span
                  v-if="isSearchingCpu"
                  class="absolute right-3 top-2.5 text-xs text-cyan-400 font-mono animate-pulse"
                >
                  Recherche...
                </span>
              </div>

              <!-- CPU Suggestions Dropdown -->
              <div
                v-if="showCpuDropdown && cpuSuggestions.length > 0"
                class="absolute z-20 top-full mt-1 left-0 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-800"
              >
                <div
                  v-for="cpu in cpuSuggestions"
                  :key="cpu.id"
                  @click="selectCpu(cpu)"
                  class="p-2.5 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <div class="text-xs font-bold text-white">{{ cpu.name }}</div>
                    <div class="text-[10px] text-slate-400">Score Gaming : {{ cpu.score.toLocaleString() }} pts</div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300 text-[10px] font-mono font-bold">
                    Tier {{ cpu.tier }}/5
                  </span>
                </div>
              </div>
            </div>

            <!-- Quick CPU presets -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-500 font-mono">Presets :</span>
              <button
                v-for="qc in QUICK_CPUS"
                :key="qc.name"
                type="button"
                @click="selectCpu(qc)"
                class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-[11px] text-slate-300 font-mono transition-colors"
              >
                {{ qc.name }}
              </button>
            </div>

            <!-- RAM & CPU Score Adjustment -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div>
                <div class="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>RAM Système</span>
                  <span class="font-bold text-cyan-400">{{ form.ramGb }} Go</span>
                </div>
                <div class="flex gap-1.5">
                  <button
                    v-for="ram in [8, 16, 32, 64]"
                    :key="ram"
                    type="button"
                    @click="form.ramGb = ram"
                    class="flex-1 py-1 text-xs font-mono rounded border transition-all"
                    :class="
                      form.ramGb === ram
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    "
                  >
                    {{ ram }} Go
                  </button>
                </div>
              </div>

              <div>
                <div class="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                  <span>Score CPU Manuel</span>
                  <span class="font-bold text-cyan-400">{{ form.cpuScore }} pts</span>
                </div>
                <input
                  v-model.number="form.cpuScore"
                  type="number"
                  min="0"
                  step="1"
                  class="w-full px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <!-- Section 4 : Système d'Exploitation (OS) -->
          <div class="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Layers class="w-3.5 h-3.5 text-brand-400" />
              <span>Système d'Exploitation (OS)</span>
            </label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                v-for="osOption in ['Windows 11', 'Windows 10', 'Linux / SteamOS', 'macOS']"
                :key="osOption"
                type="button"
                @click="form.os = osOption"
                class="py-2 px-3 text-xs rounded-lg border font-mono transition-all text-center"
                :class="
                  form.os === osOption
                    ? 'bg-brand-500/20 border-brand-500 text-brand-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                "
              >
                {{ osOption }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Annuler
            </button>

            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-400 hover:to-emerald-500 text-slate-950 shadow-glow-emerald transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <span v-if="isSubmitting">Enregistrement...</span>
              <span v-else>{{ participantToEdit ? 'Mettre à jour la machine' : 'Enregistrer le joueur & Rig' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
