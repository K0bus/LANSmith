<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'CPU' | 'GPU' | 'RAM' | 'VRAM' | 'TIER' | 'OS'
  value: string | number
  tier?: number
  subValue?: string
}>()

const tierColor = computed(() => {
  const t = props.tier ?? (typeof props.value === 'number' ? props.value : 3)
  if (t >= 5) return 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300'
  if (t === 4) return 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300'
  if (t === 3) return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300'
  if (t === 2) return 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300'
  return 'from-slate-700/30 to-slate-800/30 border-slate-700 text-slate-400'
})

const tierGlow = computed(() => {
  const t = props.tier ?? (typeof props.value === 'number' ? props.value : 3)
  if (t >= 5) return 'shadow-[0_0_10px_rgba(168,85,247,0.2)]'
  if (t === 4) return 'shadow-[0_0_10px_rgba(16,185,129,0.2)]'
  if (t === 3) return 'shadow-[0_0_10px_rgba(6,182,212,0.2)]'
  return ''
})
</script>

<template>
  <div 
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono bg-gradient-to-r transition-all"
    :class="[tierColor, tierGlow]"
  >
    <span class="font-bold opacity-75 uppercase tracking-wider text-[10px]">{{ type }}</span>
    <span class="font-semibold text-white">{{ value }}</span>
    <span v-if="subValue" class="text-[10px] opacity-75">{{ subValue }}</span>
    <span v-if="tier !== undefined" class="ml-0.5 px-1 py-0.5 rounded bg-black/50 text-[9px] font-bold border border-white/10">
      Tier {{ tier }}/5
    </span>
  </div>
</template>
