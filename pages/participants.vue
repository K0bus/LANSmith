<script setup lang="ts">
import { ref, computed } from 'vue'
import { Users, Plus, Edit2, Trash2, Cpu, Monitor, HardDrive, Sparkles, Laptop, Shield } from 'lucide-vue-next'
import HardwareBadge from '~/components/HardwareBadge.vue'
import ParticipantModal from '~/components/ParticipantModal.vue'

const { data: participants, pending, refresh } = await useFetch<any[]>('/api/participants')

const isModalOpen = ref(false)
const selectedParticipant = ref<any>(null)
const searchQuery = ref('')

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

const filteredParticipants = computed(() => {
  if (!participants.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return participants.value

  return participants.value.filter((p: any) => {
    const nick = (p.nickname || p.name || '').toLowerCase()
    const gpu = (p.rig?.gpuName || p.rig?.gpuModel || '').toLowerCase()
    const cpu = (p.rig?.cpuName || p.rig?.cpuModel || '').toLowerCase()
    return nick.includes(q) || gpu.includes(q) || cpu.includes(q)
  })
})

const stats = computed(() => {
  if (!participants.value || participants.value.length === 0) {
    return { count: 0, avgGpuTier: '0.0', avgRam: 0, minRam: 0, avgGpuScore: 0 }
  }

  const list = participants.value
  const totalGpuTier = list.reduce((acc, p) => acc + getGpuTier(p.rig?.gpuScore || 0), 0)
  const totalGpuScore = list.reduce((acc, p) => acc + (p.rig?.gpuScore || 0), 0)
  const totalRam = list.reduce((acc, p) => acc + (p.rig?.ramGb || 0), 0)
  const minRam = Math.min(...list.map((p) => p.rig?.ramGb || 16))

  return {
    count: list.length,
    avgGpuTier: (totalGpuTier / list.length).toFixed(1),
    avgGpuScore: Math.round(totalGpuScore / list.length),
    avgRam: Math.round(totalRam / list.length),
    minRam
  }
})

function openAddModal() {
  selectedParticipant.value = null
  isModalOpen.value = true
}

function openEditModal(p: any) {
  selectedParticipant.value = p
  isModalOpen.value = true
}

async function deleteParticipant(id: string, name: string) {
  if (!confirm(`Supprimer définitivement le joueur "${name}" et sa configuration ?`)) return

  try {
    await $fetch(`/api/participants/${id}`, { method: 'DELETE' })
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
          <Users class="w-6 h-6 text-brand-400" />
          <span>Parc Hardware & Configurations LAN</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Inventaire des machines saisies avec scoring PassMark et classification hardware en 5 Tiers
        </p>
      </div>

      <button
        @click="openAddModal"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-400 hover:to-emerald-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-glow-emerald transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-slate-950" />
        <span>Nouveau Joueur / PC</span>
      </button>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">Total Joueurs</div>
        <div class="text-2xl font-black text-white font-mono mt-1">{{ stats.count }}</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">GPU Tier Moyen</div>
        <div class="text-2xl font-black text-purple-400 font-mono mt-1">Tier {{ stats.avgGpuTier }} / 5</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">RAM Moyenne</div>
        <div class="text-2xl font-black text-cyan-400 font-mono mt-1">{{ stats.avgRam }} Go</div>
      </div>
      <div class="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div class="text-[11px] font-mono text-slate-400">Seuil RAM Min LAN</div>
        <div class="text-2xl font-black text-amber-400 font-mono mt-1">{{ stats.minRam }} Go</div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative w-full max-w-md">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Rechercher par pseudo, processeur, carte graphique..."
          class="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-brand-500 text-xs text-white placeholder-slate-500 font-mono"
        />
      </div>
    </div>

    <!-- Participants Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="participant in filteredParticipants"
        :key="participant.id"
        class="cyber-card p-5 border-slate-800 hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between group"
      >
        <div>
          <!-- Card Header -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <img
                :src="
                  participant.avatarUrl ||
                  participant.avatar ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${participant.nickname || participant.name}`
                "
                class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 p-0.5"
                alt="avatar"
              />
              <div>
                <h3 class="font-bold text-base text-white group-hover:text-brand-300 transition-colors">
                  {{ participant.nickname || participant.name }}
                </h3>
                <div class="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                  <Laptop class="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>{{ participant.rig?.os || 'Windows 11' }}</span>
                </div>
              </div>
            </div>

            <!-- Actions buttons -->
            <div class="flex items-center gap-1">
              <button
                @click="openEditModal(participant)"
                class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 transition-all cursor-pointer"
                title="Modifier"
              >
                <Edit2 class="w-3.5 h-3.5" />
              </button>
              <button
                @click="deleteParticipant(participant.id, participant.nickname || participant.name)"
                class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all cursor-pointer"
                title="Supprimer"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Rig Specs Details -->
          <div v-if="participant.rig" class="mt-4 space-y-2.5 pt-3 border-t border-slate-800/80 text-xs font-mono">
            <!-- GPU -->
            <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div class="flex items-center gap-1.5 truncate">
                <Monitor class="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span
                  class="text-slate-300 truncate"
                  :title="participant.rig.gpuName || participant.rig.gpuModel"
                >
                  {{ participant.rig.gpuName || participant.rig.gpuModel }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-bold">
                  {{ participant.rig.vramGb }} Go
                </span>
                <span class="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 text-[10px] font-bold">
                  T{{ getGpuTier(participant.rig.gpuScore) }} ({{ participant.rig.gpuScore }} pts)
                </span>
              </div>
            </div>

            <!-- CPU -->
            <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div class="flex items-center gap-1.5 truncate">
                <Cpu class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span
                  class="text-slate-300 truncate"
                  :title="participant.rig.cpuName || participant.rig.cpuModel"
                >
                  {{ participant.rig.cpuName || participant.rig.cpuModel }}
                </span>
              </div>
              <span class="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] font-bold shrink-0">
                T{{ getCpuTier(participant.rig.cpuScore) }} ({{ participant.rig.cpuScore }} pts)
              </span>
            </div>

            <!-- RAM & OS row -->
            <div class="grid grid-cols-2 gap-2">
              <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span class="text-slate-400 text-[11px]">RAM</span>
                <span class="text-emerald-400 font-bold">{{ participant.rig.ramGb }} Go</span>
              </div>
              <div class="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <span class="text-slate-400 text-[11px]">OS</span>
                <span class="text-slate-300 text-[11px] truncate">{{ participant.rig.os }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-2">
          <NuxtLink
            :to="`/?search=${encodeURIComponent(participant.nickname || participant.name)}`"
            class="block w-full text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold font-mono transition-all"
          >
            Voir la compatibilité jeux →
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Participant Modal -->
    <ParticipantModal
      :isOpen="isModalOpen"
      :participantToEdit="selectedParticipant"
      @close="isModalOpen = false"
      @saved="refresh"
    />
  </div>
</template>
