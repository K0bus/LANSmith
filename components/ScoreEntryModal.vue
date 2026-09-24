<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Trophy, Save, X, Trash2, Plus, Swords, ListOrdered, Check, AlertCircle } from 'lucide-vue-next'
import type { ScoringType } from '~/shared/types'

const props = defineProps<{
  isOpen: boolean
  tournament: any
  selectedGameId?: string
  participants: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const activeGameId = ref('')
const selectedRoundId = ref<string | null>(null) // null = creating a new round
const roundName = ref('')
const isSubmitting = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')

interface ParticipantRow {
  participantId: string
  participantName: string
  avatar: string | null
  // Win / Lose mode
  isWinner: boolean | null
  // Scoreboard mode
  rank: number | ''
  rawScore: number | ''
  // Computed points
  points: number
}

const rows = ref<ParticipantRow[]>([])

// List of games in tournament
const tournamentGames = computed(() => {
  if (!props.tournament) return []
  if (props.tournament.tournamentGames && props.tournament.tournamentGames.length > 0) {
    return props.tournament.tournamentGames
  }
  return (props.tournament.games || []).map((g: any, idx: number) => ({
    id: `synth-${g.id}`,
    tournamentId: props.tournament.id,
    gameId: g.id,
    scoringType: 'SCOREBOARD' as ScoringType,
    order: idx + 1,
    game: g,
    rounds: []
  }))
})

// Active TournamentGame
const activeTournamentGame = computed(() => {
  return tournamentGames.value.find((tg: any) => tg.gameId === activeGameId.value || tg.game?.id === activeGameId.value)
})

const activeScoringType = computed<ScoringType>(() => {
  return activeTournamentGame.value?.scoringType || 'SCOREBOARD'
})

// Rounds for active game
const activeGameRounds = computed(() => {
  return activeTournamentGame.value?.rounds || []
})

const scoringRules = computed<number[]>(() => {
  return props.tournament?.scoringRules || [10, 8, 6, 5, 4, 3, 2, 1]
})

// Live Win/Loss stats
const winLossStats = computed(() => {
  const winnersCount = rows.value.filter(r => r.isWinner === true).length
  const losersCount = rows.value.filter(r => r.isWinner === false).length
  const pointsPerWinner = winnersCount > 0 ? Number((losersCount / winnersCount).toFixed(2)) : 0
  return {
    winnersCount,
    losersCount,
    pointsPerWinner
  }
})

watch(() => props.isOpen, (open) => {
  if (open && props.tournament) {
    errorMessage.value = ''
    const defaultGameId = props.selectedGameId || tournamentGames.value[0]?.gameId || tournamentGames.value[0]?.game?.id || ''
    activeGameId.value = defaultGameId
    // Pick the latest round or create a new one if none
    const tg = tournamentGames.value.find((g: any) => g.gameId === defaultGameId || g.game?.id === defaultGameId)
    const existingRounds = tg?.rounds || []
    if (existingRounds.length > 0) {
      selectedRoundId.value = existingRounds[existingRounds.length - 1].id
    } else {
      selectedRoundId.value = null
    }
    initRows()
  }
})

watch(() => activeGameId.value, () => {
  const tg = activeTournamentGame.value
  const existingRounds = tg?.rounds || []
  if (existingRounds.length > 0) {
    selectedRoundId.value = existingRounds[existingRounds.length - 1].id
  } else {
    selectedRoundId.value = null
  }
  initRows()
})

watch(() => selectedRoundId.value, () => {
  initRows()
})

function initRows() {
  if (!props.participants || !props.tournament) return

  const tg = activeTournamentGame.value
  const rounds = tg?.rounds || []
  const currentRound = selectedRoundId.value ? rounds.find((r: any) => r.id === selectedRoundId.value) : null

  if (currentRound) {
    roundName.value = currentRound.name || `Manche ${currentRound.roundNumber}`
    const scoreMap = new Map((currentRound.scores || []).map((s: any) => [s.participantId, s]))

    rows.value = props.participants.map(p => {
      const existing: any = scoreMap.get(p.id)
      return {
        participantId: p.id,
        participantName: p.nickname || p.name || 'Participant',
        avatar: p.avatarUrl || p.avatar,
        isWinner: existing ? existing.isWinner : false,
        rank: existing?.rank ?? '',
        rawScore: existing?.rawScore ?? '',
        points: existing?.points ?? 0
      }
    })
  } else {
    // New Round
    const nextRoundNum = rounds.length + 1
    roundName.value = `Manche ${nextRoundNum}`

    rows.value = props.participants.map(p => ({
      participantId: p.id,
      participantName: p.nickname || p.name || 'Participant',
      avatar: p.avatarUrl || p.avatar,
      isWinner: false,
      rank: '',
      rawScore: '',
      points: 0
    }))
  }

  recalculatePoints()
}

function selectRound(roundId: string | null) {
  selectedRoundId.value = roundId
}

function startNewRound() {
  selectedRoundId.value = null
  initRows()
}

function toggleWinner(row: ParticipantRow) {
  row.isWinner = !row.isWinner
  recalculatePoints()
}

function setAllWinners(isWinner: boolean) {
  for (const r of rows.value) {
    r.isWinner = isWinner
  }
  recalculatePoints()
}

function onRankChange(row: ParticipantRow) {
  recalculatePoints()
}

function recalculatePoints() {
  if (activeScoringType.value === 'WIN_LOSE') {
    const winners = rows.value.filter(r => r.isWinner === true)
    const losers = rows.value.filter(r => r.isWinner === false)
    const W = winners.length
    const L = losers.length
    const pts = W > 0 ? Number((L / W).toFixed(2)) : 0

    for (const r of rows.value) {
      r.points = r.isWinner ? pts : 0
    }
  } else {
    // Scoreboard
    for (const r of rows.value) {
      if (r.rank !== '' && Number(r.rank) > 0) {
        const idx = Number(r.rank) - 1
        r.points = scoringRules.value[idx] ?? 0
      } else {
        r.points = 0
      }
    }
  }
}

async function saveRound() {
  if (!activeGameId.value) {
    errorMessage.value = 'Veuillez sélectionner un jeu.'
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      gameId: activeGameId.value,
      roundId: selectedRoundId.value || undefined,
      name: roundName.value.trim() || undefined,
      scores: rows.value.map(r => ({
        participantId: r.participantId,
        isWinner: activeScoringType.value === 'WIN_LOSE' ? (r.isWinner ?? false) : undefined,
        rank: activeScoringType.value === 'SCOREBOARD' ? (r.rank !== '' ? Number(r.rank) : undefined) : undefined,
        rawScore: r.rawScore !== '' ? Number(r.rawScore) : undefined
      }))
    }

    await $fetch(`/api/tournaments/${props.tournament.id}/rounds`, {
      method: 'POST',
      body: payload
    })

    emit('saved')
    emit('close')
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de l’enregistrement de la manche.'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteCurrentRound() {
  if (!selectedRoundId.value) return
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette manche ? Tous les scores associés seront effacés.')) return

  isDeleting.value = true
  errorMessage.value = ''

  try {
    await $fetch(`/api/tournaments/${props.tournament.id}/rounds/${selectedRoundId.value}`, {
      method: 'DELETE'
    })

    selectedRoundId.value = null
    emit('saved')
    initRows()
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la suppression de la manche.'
  } finally {
    isDeleting.value = false
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
      <div class="cyber-card w-full max-w-3xl p-6 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl relative my-8">
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <Trophy class="w-5 h-5 text-amber-400" />
              <span>Saisie & Gestion des Manches</span>
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Ajout de manches multiples, attribution des victoires ou des classements</p>
          </div>
          <button 
            @click="emit('close')"
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Game Selector Pills with scoring mode badge -->
        <div class="mt-4">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            1. Sélectionner l'épreuve / le jeu :
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tg in tournamentGames"
              :key="tg.gameId || tg.id"
              type="button"
              @click="activeGameId = tg.gameId || tg.game?.id"
              class="px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2"
              :class="activeGameId === (tg.gameId || tg.game?.id)
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'"
            >
              <component 
                :is="tg.scoringType === 'WIN_LOSE' ? Swords : ListOrdered" 
                class="w-3.5 h-3.5"
                :class="tg.scoringType === 'WIN_LOSE' ? 'text-rose-400' : 'text-amber-400'"
              />
              <span>{{ tg.game?.name || tg.name }}</span>
              <span 
                class="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase"
                :class="tg.scoringType === 'WIN_LOSE' ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'"
              >
                {{ tg.scoringType === 'WIN_LOSE' ? 'Gagnant/Perdant' : 'Scoreboard' }}
              </span>
            </button>
          </div>
        </div>

        <!-- Round Selector & Navigation Tabs -->
        <div class="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800/90">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-300">
              2. Sélectionner la manche à éditer :
            </label>
            <button
              type="button"
              @click="startNewRound"
              class="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1.5 transition-all"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>+ Nouvelle Manche</span>
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="r in activeGameRounds"
              :key="r.id"
              type="button"
              @click="selectRound(r.id)"
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border flex items-center gap-1.5"
              :class="selectedRoundId === r.id
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-glow-amber'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'"
            >
              <span>{{ r.name || `Manche ${r.roundNumber}` }}</span>
            </button>

            <div 
              v-if="!selectedRoundId"
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500 flex items-center gap-1"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Nouvelle Manche en cours</span>
            </div>
          </div>

          <!-- Round Name input -->
          <div class="mt-3 pt-3 border-t border-slate-800/60 flex items-center gap-3">
            <span class="text-xs font-mono text-slate-400 shrink-0">Nom de la manche :</span>
            <input 
              v-model="roundName"
              type="text"
              placeholder="Ex: Manche 1, Qualification, Finale..."
              class="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white flex-1 focus:border-amber-500"
            />
            <button
              v-if="selectedRoundId"
              type="button"
              @click="deleteCurrentRound"
              :disabled="isDeleting"
              class="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/50 flex items-center gap-1 transition-all"
              title="Supprimer cette manche"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        <!-- Mode-specific rule or Live Win/Loss Banner -->
        <!-- WIN_LOSE BANNER -->
        <div v-if="activeScoringType === 'WIN_LOSE'" class="mt-4 p-3 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/20 to-slate-950 border border-rose-800/50">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div class="flex items-center gap-2">
              <Swords class="w-4 h-4 text-rose-400 shrink-0" />
              <span class="font-bold text-white">Mode Victoire / Défaite :</span>
              <span class="text-rose-300">
                {{ winLossStats.winnersCount }} Gagnant(s) · {{ winLossStats.losersCount }} Perdant(s)
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-slate-400 text-[11px]">Gain par gagnant :</span>
              <span class="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/50 font-black text-sm">
                +{{ winLossStats.pointsPerWinner }} pts
              </span>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">
            Formule : Les vainqueurs se partagent les points équivalents au nombre total de perdants ({{ winLossStats.losersCount }} pts ÷ {{ winLossStats.winnersCount || 1 }} = {{ winLossStats.pointsPerWinner }} pts chacun).
          </p>

          <!-- Quick actions for win/loss -->
          <div class="mt-2 flex gap-2 pt-2 border-t border-rose-950/60 text-[11px] font-mono">
            <button 
              type="button" 
              @click="setAllWinners(true)"
              class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            >
              Tous Gagnants
            </button>
            <button 
              type="button" 
              @click="setAllWinners(false)"
              class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            >
              Tous Perdants
            </button>
          </div>
        </div>

        <!-- SCOREBOARD SCALE BANNER -->
        <div v-else class="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
          <div class="flex items-center gap-2 text-slate-300">
            <ListOrdered class="w-4 h-4 text-amber-400 shrink-0" />
            <span class="font-bold">Barème de manche (Scoreboard) :</span>
          </div>
          <div class="flex flex-wrap gap-1.5 text-[11px]">
            <span v-for="(pts, idx) in scoringRules.slice(0, 6)" :key="idx" class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              #{{ idx + 1 }}: +{{ pts }}pts
            </span>
          </div>
        </div>

        <!-- Information rule note about Tournament Scale on final Game Rank -->
        <div class="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span class="text-amber-400 font-bold flex items-center gap-1">
            <Trophy class="w-3.5 h-3.5" />
            <span>Score Final du Jeu :</span>
          </span>
          <span class="text-slate-300">
            Total des manches $\rightarrow$ Classement du jeu $\rightarrow$ Barème du tournoi ($1^{\text{er}}=10\text{pts}, 2^{\text{e}}=8\text{pts}\dots$)
          </span>
        </div>

        <!-- Table of participants -->
        <div class="mt-4 max-h-80 overflow-y-auto pr-1">
          <div v-if="errorMessage" class="mb-3 p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {{ errorMessage }}
          </div>

          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th class="py-2 pl-2">Joueur</th>
                
                <!-- If WIN_LOSE mode -->
                <template v-if="activeScoringType === 'WIN_LOSE'">
                  <th class="py-2 text-center w-48">Statut de la manche</th>
                </template>

                <!-- If SCOREBOARD mode -->
                <template v-else>
                  <th class="py-2 w-28">Rang (1er...)</th>
                  <th class="py-2 w-28">Score Brut (opt.)</th>
                </template>

                <th class="py-2 w-28 text-right pr-2">Points gagnés</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 font-mono">
              <tr v-for="row in rows" :key="row.participantId" class="hover:bg-slate-850/50 transition-colors">
                <td class="py-2.5 pl-2 font-sans font-semibold text-white flex items-center gap-2">
                  <img :src="row.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${row.participantName}`" class="w-6 h-6 rounded-full bg-slate-800 shrink-0" />
                  <span class="truncate">{{ row.participantName }}</span>
                </td>

                <!-- WIN_LOSE Toggle Buttons -->
                <td v-if="activeScoringType === 'WIN_LOSE'" class="py-2 text-center">
                  <div class="inline-flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      @click="row.isWinner = true; recalculatePoints()"
                      class="px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1"
                      :class="row.isWinner === true
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                        : 'text-slate-400 hover:text-white'"
                    >
                      <Check class="w-3.5 h-3.5" />
                      <span>Gagnant</span>
                    </button>
                    <button
                      type="button"
                      @click="row.isWinner = false; recalculatePoints()"
                      class="px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1"
                      :class="row.isWinner === false
                        ? 'bg-slate-700 text-slate-200'
                        : 'text-slate-500 hover:text-white'"
                    >
                      <X class="w-3.5 h-3.5" />
                      <span>Perdant</span>
                    </button>
                  </div>
                </td>

                <!-- SCOREBOARD Inputs -->
                <template v-else>
                  <td class="py-2">
                    <input 
                      v-model.number="row.rank"
                      @input="onRankChange(row)"
                      type="number"
                      min="1"
                      :max="rows.length"
                      placeholder="Rang"
                      class="w-20 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-700 focus:border-amber-500 text-white font-bold text-center"
                    />
                  </td>

                  <td class="py-2">
                    <input 
                      v-model.number="row.rawScore"
                      type="number"
                      step="any"
                      placeholder="Kills/Temps"
                      class="w-24 px-2 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-300 text-center"
                    />
                  </td>
                </template>

                <!-- Points computed -->
                <td class="py-2 pr-2 text-right">
                  <span 
                    class="inline-block px-2.5 py-1 rounded-lg font-bold text-xs font-mono"
                    :class="row.points > 0 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                      : 'text-slate-600'"
                  >
                    +{{ row.points }} pts
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-800">
          <button 
            type="button"
            @click="emit('close')"
            class="px-4 py-2.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Annuler
          </button>

          <button 
            type="button"
            @click="saveRound"
            :disabled="isSubmitting"
            class="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Enregistrement...' : 'Valider cette Manche' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

