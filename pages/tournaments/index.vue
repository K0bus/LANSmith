<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy, Plus, Gamepad2, ArrowRight, X, Sparkles, CheckSquare, Square, Swords, ListOrdered, Pencil, Trash2, Share2, Copy, Check, ExternalLink, Radio, Shuffle } from 'lucide-vue-next'
import type { ScoringType } from '~/shared/types'

const { data: tournaments, pending, refresh } = await useFetch<any[]>('/api/tournaments')
const { data: availableGames } = await useFetch<any[]>('/api/games')

interface SelectedGameItem {
  gameId: string
  scoringType: ScoringType
  teamSize?: number
}

const isModalOpen = ref(false)
const editingTournamentId = ref<string | null>(null)

// Share Modal State
const isShareModalOpen = ref(false)
const sharedTournament = ref<any>(null)
const shareCopied = ref(false)

const shareUrl = computed(() => {
  if (!sharedTournament.value || !process.client) return ''
  return `${window.location.origin}/tournaments/${sharedTournament.value.id}/public`
})

function openShareModal(tournament: any) {
  sharedTournament.value = tournament
  shareCopied.value = false
  isShareModalOpen.value = true
}

function copyShareUrl() {
  if (!process.client || !shareUrl.value) return
  navigator.clipboard.writeText(shareUrl.value)
  shareCopied.value = true
  setTimeout(() => {
    shareCopied.value = false
  }, 2500)
}

const form = ref({
  name: '',
  status: 'IN_PROGRESS',
  selectedGames: [] as SelectedGameItem[],
  scoringPreset: 'classic' // 'classic' (10, 8, 6, 5, 4, 3, 2, 1) or 'f1' (25, 18, 15, 12, 10, 8, 6, 4, 2, 1)
})
const isSubmitting = ref(false)
const isDeletingId = ref<string | null>(null)
const errorMessage = ref('')

function openCreateModal() {
  editingTournamentId.value = null
  const initialGames: SelectedGameItem[] = (availableGames.value?.slice(0, 4) || []).map((g: any) => ({
    gameId: g.id,
    scoringType: 'SCOREBOARD',
    teamSize: 1
  }))

  form.value = {
    name: 'Tournoi Multi-Jeux ' + new Date().toLocaleDateString('fr-FR'),
    status: 'IN_PROGRESS',
    selectedGames: initialGames,
    scoringPreset: 'classic'
  }
  isModalOpen.value = true
}

function openEditModal(t: any) {
  editingTournamentId.value = t.id

  const selectedGames: SelectedGameItem[] = []
  if (t.tournamentGames && t.tournamentGames.length > 0) {
    for (const tg of t.tournamentGames) {
      selectedGames.push({
        gameId: tg.gameId || tg.game?.id,
        scoringType: (tg.scoringType || 'SCOREBOARD') as ScoringType,
        teamSize: tg.teamSize || 1
      })
    }
  } else if (t.games && t.games.length > 0) {
    for (const g of t.games) {
      selectedGames.push({
        gameId: g.id,
        scoringType: 'SCOREBOARD',
        teamSize: 1
      })
    }
  }

  // Detect preset
  const isF1 = Array.isArray(t.scoringRules) && t.scoringRules[0] === 25
  const scoringPreset = isF1 ? 'f1' : 'classic'

  form.value = {
    name: t.name,
    status: t.status || 'IN_PROGRESS',
    selectedGames,
    scoringPreset
  }
  isModalOpen.value = true
}

function isGameSelected(gameId: string): boolean {
  return form.value.selectedGames.some(g => g.gameId === gameId)
}

function getGameConfig(gameId: string): SelectedGameItem | undefined {
  return form.value.selectedGames.find(g => g.gameId === gameId)
}

function toggleGameSelection(gameId: string) {
  const idx = form.value.selectedGames.findIndex(g => g.gameId === gameId)
  if (idx >= 0) {
    form.value.selectedGames.splice(idx, 1)
  } else {
    form.value.selectedGames.push({
      gameId,
      scoringType: 'SCOREBOARD',
      teamSize: 1
    })
  }
}

function setGameScoringType(gameId: string, type: ScoringType) {
  const item = form.value.selectedGames.find(g => g.gameId === gameId)
  if (item) {
    item.scoringType = type
    if (type === 'ROUND_ROBIN' && !item.teamSize) {
      item.teamSize = 1
    }
  }
}

function setGameTeamSize(gameId: string, size: number) {
  const item = form.value.selectedGames.find(g => g.gameId === gameId)
  if (item) {
    item.teamSize = size
  }
}

async function saveTournament() {
  if (!form.value.name.trim()) {
    errorMessage.value = 'Le titre du tournoi est obligatoire.'
    return
  }
  if (form.value.selectedGames.length === 0) {
    errorMessage.value = 'Veuillez sélectionner au moins un jeu pour le tournoi.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const scoringRules = form.value.scoringPreset === 'f1'
      ? [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
      : [10, 8, 6, 5, 4, 3, 2, 1]

    if (editingTournamentId.value) {
      // Update
      await $fetch(`/api/tournaments/${editingTournamentId.value}`, {
        method: 'PUT',
        body: {
          name: form.value.name,
          status: form.value.status,
          games: form.value.selectedGames,
          scoringRules
        }
      })
    } else {
      // Create
      await $fetch('/api/tournaments', {
        method: 'POST',
        body: {
          name: form.value.name,
          status: form.value.status,
          games: form.value.selectedGames,
          scoringRules
        }
      })
    }

    isModalOpen.value = false
    refresh()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de l’enregistrement du tournoi.'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteTournament(tournament: any) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le tournoi "${tournament.name}" ?`)) {
    return
  }

  isDeletingId.value = tournament.id
  try {
    await $fetch(`/api/tournaments/${tournament.id}`, {
      method: 'DELETE'
    })
    refresh()
  } catch (err: any) {
    alert(err.data?.statusMessage || 'Erreur lors de la suppression du tournoi.')
  } finally {
    isDeletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-white flex items-center gap-2.5">
          <Trophy class="w-6 h-6 text-amber-400" />
          <span>Tournois Multi-Jeux & Compétitions</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Organisation d'épreuves combinées, gestion des manches par jeu et classements généraux en direct
        </p>
      </div>

      <button 
        @click="openCreateModal"
        class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
      >
        <Plus class="w-4 h-4 text-slate-950" />
        <span>Créer un Tournoi</span>
      </button>
    </div>

    <!-- Tournaments List -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div 
        v-for="tournament in tournaments" 
        :key="tournament.id"
        class="cyber-card p-6 border-slate-800 hover:border-amber-500/50 flex flex-col justify-between group transition-all"
      >
        <div>
          <!-- Status, Title & Actions -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span 
                  class="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider"
                  :class="{
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40': tournament.status === 'IN_PROGRESS',
                    'bg-blue-500/20 text-blue-300 border border-blue-500/40': tournament.status === 'COMPLETED',
                    'bg-slate-800 text-slate-400': tournament.status === 'DRAFT'
                  }"
                >
                  {{ tournament.status === 'IN_PROGRESS' ? '● En cours' : (tournament.status === 'COMPLETED' ? 'Terminé' : 'Brouillon') }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                {{ tournament.name }}
              </h3>
            </div>

            <!-- Card actions (Share / Edit / Delete) -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                @click="openShareModal(tournament)"
                class="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:bg-slate-850 hover:border-cyan-500/50 transition-all cursor-pointer"
                title="Partager le lien spectateur en direct"
              >
                <Share2 class="w-4 h-4" />
              </button>
              <button
                @click="openEditModal(tournament)"
                class="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-850 hover:border-amber-500/50 transition-all cursor-pointer"
                title="Modifier le tournoi"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                @click="deleteTournament(tournament)"
                :disabled="isDeletingId === tournament.id"
                class="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-850 hover:border-rose-500/50 transition-all cursor-pointer"
                title="Supprimer le tournoi"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Included Games preview -->
          <div class="mt-4 space-y-2">
            <div class="text-[11px] font-mono text-slate-400 font-bold uppercase">
              Jeux au programme ({{ tournament.tournamentGames?.length || tournament.games?.length || 0 }}) :
            </div>
            <div class="flex flex-wrap gap-2">
              <div 
                v-for="tg in (tournament.tournamentGames || tournament.games || [])" 
                :key="tg.id"
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono"
              >
                <component 
                  :is="tg.scoringType === 'WIN_LOSE' ? Swords : (tg.scoringType === 'ROUND_ROBIN' ? Shuffle : ListOrdered)" 
                  class="w-3.5 h-3.5 shrink-0"
                  :class="{
                    'text-rose-400': tg.scoringType === 'WIN_LOSE',
                    'text-cyan-400': tg.scoringType === 'ROUND_ROBIN',
                    'text-amber-400': tg.scoringType !== 'WIN_LOSE' && tg.scoringType !== 'ROUND_ROBIN'
                  }"
                />
                <span class="truncate max-w-[130px] font-medium">{{ tg.game?.name || tg.name }}</span>
                <span 
                  class="text-[10px] px-1 py-0.2 rounded font-bold"
                  :class="{
                    'bg-rose-950 text-rose-300 border border-rose-800/50': tg.scoringType === 'WIN_LOSE',
                    'bg-cyan-950 text-cyan-300 border border-cyan-800/50': tg.scoringType === 'ROUND_ROBIN',
                    'bg-amber-950 text-amber-300 border border-amber-800/50': tg.scoringType !== 'WIN_LOSE' && tg.scoringType !== 'ROUND_ROBIN'
                  }"
                >
                  {{ tg.scoringType === 'WIN_LOSE' ? 'Gagnant/Perdant' : (tg.scoringType === 'ROUND_ROBIN' ? 'Round-Robin' : 'Scoreboard') }}
                </span>
                <span v-if="tg.rounds?.length > 0 || tg.matches?.length > 0" class="text-[10px] text-slate-400">
                  ({{ tg.scoringType === 'ROUND_ROBIN' ? `${tg.matches?.length || 0} matchs` : `${tg.rounds.length} m.` }})
                </span>
              </div>
            </div>
          </div>

          <!-- Scoring Scale -->
          <div class="mt-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono flex items-center justify-between">
            <span class="text-slate-400">Barème Scoreboard :</span>
            <div class="text-amber-400 font-bold">
              {{ tournament.scoringRules ? tournament.scoringRules.slice(0, 5).join(' - ') + ' pts...' : '10 - 8 - 6 - 5...' }}
            </div>
          </div>
        </div>

        <div class="pt-6 mt-4 border-t border-slate-800/60 flex items-center gap-3">
          <NuxtLink 
            :to="`/tournaments/${tournament.id}`" 
            class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-bold font-mono transition-all"
          >
            <span>Accéder au Leaderboard & Saisie des Manches</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Create / Edit Tournament Modal -->
    <Teleport to="body">
      <div 
        v-if="isModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="isModalOpen = false"
      >
        <div class="cyber-card w-full max-w-2xl p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative my-8">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <Trophy class="w-5 h-5 text-amber-400" />
                <span>{{ editingTournamentId ? 'Modifier le Tournoi' : 'Créer un Nouveau Tournoi' }}</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Configurez les épreuves, le mode de points de manche et le statut</p>
            </div>
            <button @click="isModalOpen = false" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
              <X class="w-5 h-5" />
            </button>
          </div>

          <form @submit.prevent="saveTournament" class="mt-6 space-y-6">
            <div v-if="errorMessage" class="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
              {{ errorMessage }}
            </div>

            <!-- Tournament Name & Status -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Titre du Tournoi *
                </label>
                <input 
                  v-model="form.name"
                  type="text" 
                  placeholder="Ex: LANSmith Grand Prix 2026"
                  required
                  class="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Statut
                </label>
                <select
                  v-model="form.status"
                  class="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 font-mono"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                </select>
              </div>
            </div>

            <!-- Games selection with per-game scoring type -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Sélectionnez les jeux et le système de points par manche ({{ form.selectedGames.length }} sélectionnés) *
              </label>
              <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                <div 
                  v-for="game in availableGames" 
                  :key="game.id"
                  class="p-3 rounded-xl border transition-all"
                  :class="isGameSelected(game.id)
                    ? 'bg-slate-950/90 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'"
                >
                  <div class="flex items-center justify-between gap-3">
                    <div 
                      @click="toggleGameSelection(game.id)" 
                      class="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <component 
                        :is="isGameSelected(game.id) ? CheckSquare : Square" 
                        class="w-5 h-5 shrink-0" 
                        :class="isGameSelected(game.id) ? 'text-amber-400' : 'text-slate-600'" 
                      />
                      <img :src="game.coverUrl || 'https://placehold.co/50x70'" class="w-8 h-11 object-cover rounded bg-slate-800 shrink-0" />
                      <div class="min-w-0 flex-1">
                        <div class="text-xs font-bold text-white truncate">{{ game.name }}</div>
                        <div class="text-[10px] text-slate-400 truncate">{{ game.genres || 'Jeu LAN' }}</div>
                      </div>
                    </div>

                    <!-- Scoring type toggle if selected -->
                    <div v-if="isGameSelected(game.id)" class="flex items-center gap-1.5 shrink-0 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        @click="setGameScoringType(game.id, 'SCOREBOARD')"
                        class="px-2.5 py-1 rounded text-[11px] font-bold font-mono flex items-center gap-1 transition-all"
                        :class="getGameConfig(game.id)?.scoringType === 'SCOREBOARD'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'"
                        title="Attribution des points selon le classement de manche (1er, 2e, 3e...)"
                      >
                        <ListOrdered class="w-3.5 h-3.5" />
                        <span>Scoreboard</span>
                      </button>

                      <button
                        type="button"
                        @click="setGameScoringType(game.id, 'WIN_LOSE')"
                        class="px-2.5 py-1 rounded text-[11px] font-bold font-mono flex items-center gap-1 transition-all"
                        :class="getGameConfig(game.id)?.scoringType === 'WIN_LOSE'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'"
                        title="Les gagnants se partagent le nombre de points égal au nombre de perdants"
                      >
                        <Swords class="w-3.5 h-3.5" />
                        <span>Gagnant/Perdant</span>
                      </button>
                      <button
                        type="button"
                        @click="setGameScoringType(game.id, 'ROUND_ROBIN')"
                        class="px-2.5 py-1 rounded text-[11px] font-bold font-mono flex items-center gap-1 transition-all"
                        :class="getGameConfig(game.id)?.scoringType === 'ROUND_ROBIN'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'"
                        title="Tournoi Toutes Rondes (Round-Robin) avec calendrier officiel de confrontations"
                      >
                        <Shuffle class="w-3.5 h-3.5" />
                        <span>Round-Robin</span>
                      </button>
                    </div>
                  </div>

                  <!-- Details tip for win-lose if active -->
                  <div v-if="isGameSelected(game.id) && getGameConfig(game.id)?.scoringType === 'WIN_LOSE'" class="mt-2 text-[10px] font-mono text-rose-300/80 bg-rose-950/30 px-2.5 py-1 rounded border border-rose-900/40 flex items-center justify-between">
                    <span>⚔️ Mode Victoire/Défaite : les gagnants se partagent les points des perdants (L / W).</span>
                  </div>

                  <!-- Details & format for SCOREBOARD -->
                  <div v-if="isGameSelected(game.id) && getGameConfig(game.id)?.scoringType === 'SCOREBOARD'" class="mt-2.5 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 space-y-2">
                    <div class="flex items-center justify-between text-[11px] font-mono text-amber-300">
                      <span class="font-bold flex items-center gap-1.5">
                        <ListOrdered class="w-3.5 h-3.5" />
                        Format de l'épreuve :
                      </span>
                      <span class="text-[10px] text-amber-400/80">
                        {{ (getGameConfig(game.id)?.teamSize || 1) === 1 ? '👤 Solo (Individuel)' : `👥 Équipes de ${getGameConfig(game.id)?.teamSize} (Équilibrage 1er+Dernier)` }}
                      </span>
                    </div>

                    <!-- Team Size Selector Buttons -->
                    <div class="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 1)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="(getGameConfig(game.id)?.teamSize || 1) === 1
                          ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👤 Solo
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 2)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 2
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👥 Duos ⚡
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 3)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 3
                          ? 'bg-gradient-to-r from-amber-400 to-orange-600 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👥 Trios
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 4)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 4
                          ? 'bg-gradient-to-r from-amber-400 to-red-500 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        🛡️ Squads
                      </button>
                    </div>

                    <p class="text-[10px] font-mono text-slate-400 leading-tight">
                      <span v-if="(getGameConfig(game.id)?.teamSize || 1) === 1">
                        Attribution des points selon le rang individuel à chaque manche (1er, 2e, 3e...).
                      </span>
                      <span v-else>
                        Équipes équilibrées selon le classement global (1er avec dernier, 2e avec avant-dernier...). Tous les coéquipiers reçoivent les points de leur équipe à chaque manche.
                      </span>
                    </p>
                  </div>

                  <!-- Details tip for round-robin if active -->
                  <div v-if="isGameSelected(game.id) && getGameConfig(game.id)?.scoringType === 'ROUND_ROBIN'" class="mt-2.5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/50 space-y-2">
                    <div class="flex items-center justify-between text-[11px] font-mono text-cyan-300">
                      <span class="font-bold flex items-center gap-1.5">
                        <Shuffle class="w-3.5 h-3.5" />
                        Format de confrontation :
                      </span>
                      <span class="text-[10px] text-cyan-400/80">
                        {{ (getGameConfig(game.id)?.teamSize || 1) === 1 ? '1v1 Solo' : `Équipes de ${getGameConfig(game.id)?.teamSize} (Équilibrage 1er+Dernier)` }}
                      </span>
                    </div>

                    <!-- Team Size Selector Buttons -->
                    <div class="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 1)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="(getGameConfig(game.id)?.teamSize || 1) === 1
                          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👤 Solo (1v1)
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 2)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 2
                          ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👥 Duos (2v2) ⚡
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 3)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 3
                          ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        👥 Trios (3v3)
                      </button>
                      <button
                        type="button"
                        @click="setGameTeamSize(game.id, 4)"
                        class="px-2 py-1.5 rounded text-[10px] font-mono font-bold transition-all text-center"
                        :class="getGameConfig(game.id)?.teamSize === 4
                          ? 'bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 font-black shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'"
                      >
                        🛡️ Squads (4v4)
                      </button>
                    </div>

                    <p class="text-[10px] font-mono text-slate-400 leading-tight">
                      <span v-if="(getGameConfig(game.id)?.teamSize || 1) === 1">
                        Calendrier officiel complet : chacun affronte tous les autres joueurs en 1v1.
                      </span>
                      <span v-else>
                        Les équipes sont automatiquement composées et équilibrées selon le classement global (1er avec dernier, 2e avec avant-dernier...).
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Scoring Rule Preset -->
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Barème du tournoi (appliqué au classement final de chaque jeu) :
              </label>
              <div class="grid grid-cols-2 gap-3 font-mono text-xs">
                <label 
                  class="p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all"
                  :class="form.scoringPreset === 'classic' ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'"
                >
                  <input type="radio" v-model="form.scoringPreset" value="classic" class="sr-only" />
                  <span class="font-bold">Barème Standard LAN</span>
                  <span class="text-[10px] opacity-80">1er = 10pts, 2e = 8pts, 3e = 6pts, 4e = 5pts...</span>
                </label>

                <label 
                  class="p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all"
                  :class="form.scoringPreset === 'f1' ? 'bg-amber-500/15 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'"
                >
                  <input type="radio" v-model="form.scoringPreset" value="f1" class="sr-only" />
                  <span class="font-bold">Barème Formule 1</span>
                  <span class="text-[10px] opacity-80">1er = 25pts, 2e = 18pts, 3e = 15pts, 4e = 12pts...</span>
                </label>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button 
                type="button" 
                @click="isModalOpen = false"
                class="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Annuler
              </button>

              <button 
                type="submit"
                :disabled="isSubmitting"
                class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Plus v-if="!editingTournamentId" class="w-4 h-4" />
                <Pencil v-else class="w-4 h-4" />
                <span>{{ isSubmitting ? 'Enregistrement...' : (editingTournamentId ? 'Enregistrer les Modifications' : 'Lancer le Tournoi') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Share Tournament Public Modal -->
    <Teleport to="body">
      <div 
        v-if="isShareModalOpen && sharedTournament"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        @click.self="isShareModalOpen = false"
      >
        <div class="cyber-card p-6 border-slate-700 bg-slate-900/95 max-w-lg w-full space-y-6 shadow-2xl relative">
          
          <!-- Header -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Share2 class="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">Partager le Tournoi en Direct</h3>
                <p class="text-xs text-slate-400 font-mono">{{ sharedTournament.name }}</p>
              </div>
            </div>

            <button 
              @click="isShareModalOpen = false"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Feature Description -->
          <div class="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div class="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <Radio class="w-3.5 h-3.5 animate-pulse" />
              <span>Vue Spectateur & Diffusion (Lecture Seule)</span>
            </div>
            <p class="text-slate-400 text-[11px] leading-relaxed">
              Ce lien donne un accès direct en lecture seule (sans saisie possible) permettant à tous les participants et spectateurs de suivre :
            </p>
            <ul class="list-disc list-inside text-[11px] text-slate-400 space-y-1 font-mono">
              <li>Le classement général et le podium en direct</li>
              <li>La rotation automatique des classements par jeu</li>
              <li>Le flux en temps réel des derniers scores enregistrés</li>
            </ul>
          </div>

          <!-- Share Link Box -->
          <div class="space-y-2">
            <label class="block text-xs font-mono font-bold text-slate-300 uppercase">
              Lien public partageable :
            </label>
            <div class="flex items-center gap-2">
              <input 
                :value="shareUrl" 
                readonly
                class="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono outline-none select-all"
              />
              <button
                @click="copyShareUrl"
                class="px-4 py-2.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all cursor-pointer shrink-0"
                :class="shareCopied ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'"
              >
                <Check v-if="shareCopied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ shareCopied ? 'Copié !' : 'Copier' }}</span>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              @click="isShareModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Fermer
            </button>

            <NuxtLink
              :to="`/tournaments/${sharedTournament.id}/public`"
              target="_blank"
              class="px-4 py-2 text-xs font-bold font-mono rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 flex items-center gap-2 transition-all"
            >
              <span>Ouvrir la vue Live</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </NuxtLink>
          </div>

        </div>
      </div>
    </Teleport>
  </div>
</template>


