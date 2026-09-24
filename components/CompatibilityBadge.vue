<script setup lang="ts">
import { ref } from 'vue'
import { CheckCircle2, AlertTriangle, XCircle, Info, Sparkles, Activity } from 'lucide-vue-next'

const props = defineProps<{
  result?: any
  showDetailsOnClick?: boolean
  compact?: boolean
}>()

const isModalOpen = ref(false)

function toggleModal() {
  if (props.showDetailsOnClick && props.result) {
    isModalOpen.value = !isModalOpen.value
  }
}
</script>

<template>
  <div class="inline-block relative">
    <!-- Non-evaluated fallback -->
    <div
      v-if="!result"
      class="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs font-mono"
    >
      <span>N/A</span>
    </div>

    <!-- OPTIMAL (1440p+) / READY -->
    <button
      v-else-if="result.status === 'OPTIMAL' || result.status === 'READY'"
      type="button"
      @click="toggleModal"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-xs font-semibold shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-900/50 transition-all cursor-pointer group font-mono"
      :class="{ 'px-2 py-0.5 text-[11px]': compact }"
    >
      <CheckCircle2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>1440P+ (Optimal)</span>
    </button>

    <!-- PASS (1080p stable) -->
    <button
      v-else-if="result.status === 'PASS'"
      type="button"
      @click="toggleModal"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-sky-500/50 bg-sky-950/40 text-sky-300 text-xs font-semibold shadow-[0_0_12px_rgba(56,189,248,0.25)] hover:bg-sky-900/50 transition-all cursor-pointer group font-mono"
      :class="{ 'px-2 py-0.5 text-[11px]': compact }"
    >
      <CheckCircle2 class="w-3.5 h-3.5 text-sky-400 shrink-0" />
      <span>1080P Ready</span>
    </button>

    <!-- MARGINAL (720p 30fps) / WARNING -->
    <button
      v-else-if="result.status === 'MARGINAL' || result.status === 'WARNING'"
      type="button"
      @click="toggleModal"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-500/50 bg-amber-950/40 text-amber-300 text-xs font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-900/50 transition-all cursor-pointer group font-mono"
      :class="{ 'px-2 py-0.5 text-[11px]': compact }"
    >
      <AlertTriangle class="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>720P / 30fps</span>
    </button>

    <!-- FAIL / INSUFFICIENT -->
    <button
      v-else
      type="button"
      @click="toggleModal"
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-500/50 bg-rose-950/40 text-rose-300 text-xs font-semibold shadow-[0_0_12px_rgba(244,63,94,0.25)] hover:bg-rose-900/50 transition-all cursor-pointer group font-mono"
      :class="{ 'px-2 py-0.5 text-[11px]': compact }"
    >
      <XCircle class="w-3.5 h-3.5 text-rose-400 shrink-0" />
      <span>Incompatible</span>
    </button>

    <!-- Modal Diagnostic Detail -->
    <Teleport to="body">
      <div
        v-if="isModalOpen && result"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        @click.self="isModalOpen = false"
      >
        <div
          class="cyber-card w-full max-w-md p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative"
        >
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span
                class="w-3 h-3 rounded-full"
                :class="{
                  'bg-emerald-500 shadow-[0_0_10px_#10b981]':
                    result.status === 'OPTIMAL' || result.status === 'READY',
                  'bg-sky-500 shadow-[0_0_10px_#38bdf8]': result.status === 'PASS',
                  'bg-amber-500 shadow-[0_0_10px_#f59e0b]':
                    result.status === 'MARGINAL' || result.status === 'WARNING',
                  'bg-rose-500 shadow-[0_0_10px_#f43f5e]':
                    result.status === 'FAIL' || result.status === 'INSUFFICIENT'
                }"
              />
              <h3 class="font-bold text-base text-white">Diagnostic Matériel & Jeu</h3>
            </div>
            <button
              @click="isModalOpen = false"
              class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <!-- Ratios & Bottleneck Summary -->
          <div class="grid grid-cols-2 gap-2 mb-4 text-xs font-mono">
            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div class="text-slate-400 text-[10px] uppercase">Ratio GPU / Min</div>
              <div
                class="text-sm font-bold mt-0.5"
                :class="(result.gpuRatio || 1) >= 1 ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ result.gpuRatio ?? 'N/A' }}x
              </div>
            </div>
            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div class="text-slate-400 text-[10px] uppercase">Ratio CPU / Min</div>
              <div
                class="text-sm font-bold mt-0.5"
                :class="(result.cpuRatio || 1) >= 1 ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ result.cpuRatio ?? 'N/A' }}x
              </div>
            </div>
          </div>

          <!-- Recommended settings badge -->
          <div
            v-if="result.recommendedSettings"
            class="mb-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono"
          >
            <span class="text-slate-400 text-[11px]">Profil recommandé :</span>
            <span class="font-bold text-brand-300">{{ result.recommendedSettings }}</span>
          </div>

          <!-- Bottlenecks & reasons alert -->
          <div
            v-if="result.reasons && result.reasons.length > 0"
            class="mb-4 p-3 rounded-lg border text-xs space-y-1.5"
            :class="
              result.status === 'FAIL'
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                : result.status === 'MARGINAL'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            "
          >
            <div class="font-bold flex items-center gap-1.5">
              <Activity class="w-3.5 h-3.5 shrink-0" />
              <span>Détails & Analyse :</span>
            </div>
            <ul class="list-disc list-inside space-y-1 pl-1 opacity-90 text-[11px]">
              <li v-for="(reason, i) in result.reasons" :key="i">{{ reason }}</li>
            </ul>
          </div>

          <div class="mt-4 flex justify-end">
            <button
              @click="isModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
