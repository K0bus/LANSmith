<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Trophy, Save, X, Trash2, Plus, Swords, ListOrdered, Check, AlertCircle, Shuffle, Users, Sparkles, RefreshCw, Zap } from 'lucide-vue-next'
import type { ScoringType } from '~/shared/types'
import { generateBalancedTeams } from '~/server/utils/roundRobin'

const props = defineProps<{
  isOpen: boolean
  tournament: any
  selectedGameId?: string
  participants: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
  (e: 'openRoundRobin', gameId: string): void
}>()

const activeGameId = ref('')
const selectedRoundId = ref<string | null>(null) // null = creating a new round
const roundName = ref('')
const isSubmitting = ref(false)
const isDeleting = ref(false)
const isGeneratingTeams = ref(false)
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

interface TeamMember {
  id: string
  nickname: string
  avatarUrl?: string | null
  globalRank?: number
  totalPoints?: number
}

interface TeamRow {
  id: string
  name: string
  seed: number
  members: TeamMember[]
  rank: number | ''
  rawScore: number | ''
  points: number
}

const rows = ref<ParticipantRow[]>([])
const teamRows = ref<TeamRow[]>([])

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
    teamSize: 1,
    order: idx + 1,
    game: g,
    rounds: [],
    teams: []
  }))
})

// Active TournamentGame
const activeTournamentGame = computed(() => {
  return tournamentGames.value.find((tg: any) => tg.gameId === activeGameId.value || tg.game?.id === activeGameId.value)
})

const activeScoringType = computed<ScoringType>(() => {
  return activeTournamentGame.value?.scoringType || 'SCOREBOARD'
})

const teamSize = computed<number>(() => {
  return activeTournamentGame.value?.teamSize || 1
})

const isTeamMode = computed<boolean>(() => {
  return activeScoringType.value === 'SCOREBOARD' && (teamSize.value > 1 || (activeTournamentGame.value?.teams && activeTournamentGame.value.teams.length > 0))
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

// Participant standings map (from props or tournament if available)
const participantStandingsMap = computed(() => {
  const map = new Map<string, { globalRank: number, totalPoints: number }>()
  for (let i = 0; i < (props.participants || []).length; i++) {
    const p = props.participants[i]
    map.set(p.id, {
      globalRank: p.globalRank || (i + 1),
      totalPoints: p.totalPoints || 0
    })
  }
  return map
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

  // Handle Teams if in team mode
  if (isTeamMode.value) {
    initTeamRows(currentRound)
  }

  recalculatePoints()
}

function initTeamRows(currentRound?: any) {
  const tg = activeTournamentGame.value
  const existingTeams = tg?.teams || []

  const scoreMap = currentRound ? new Map((currentRound.scores || []).map((s: any) => [s.participantId, s])) : new Map()

  if (existingTeams.length > 0) {
    teamRows.value = existingTeams.map((t: any) => {
      const members: TeamMember[] = (t.members || []).map((m: any) => {
        const stats = participantStandingsMap.value.get(m.id)
        return {
          id: m.id,
          nickname: m.nickname || m.name || 'Joueur',
          avatarUrl: m.avatarUrl || m.avatar,
          globalRank: stats?.globalRank,
          totalPoints: stats?.totalPoints
        }
      })

      // Get existing rank & score from first member with data
      let rank: number | '' = ''
      let rawScore: number | '' = ''
      let points = 0

      for (const m of members) {
        const s: any = scoreMap.get(m.id)
        if (s) {
          if (s.rank !== undefined && s.rank !== null) rank = s.rank
          if (s.rawScore !== undefined && s.rawScore !== null) rawScore = s.rawScore
          if (s.points !== undefined && s.points !== null) points = s.points
          break
        }
      }

      return {
        id: t.id,
        name: t.name,
        seed: t.seed,
        members,
        rank,
        rawScore,
        points
      }
    })
  } else {
    // Auto-generate balanced teams in memory
    autoBalanceTeamsInMemory()
  }
}

function autoBalanceTeamsInMemory(shuffle = false) {
  if (!props.participants || props.participants.length === 0) return

  let participantList = [...props.participants]

  if (!shuffle) {
    // Sort by leaderboard points / rank (1st to last)
    participantList.sort((a, b) => {
      const statsA = participantStandingsMap.value.get(a.id)?.totalPoints ?? 0
      const statsB = participantStandingsMap.value.get(b.id)?.totalPoints ?? 0
      if (statsB !== statsA) return statsB - statsA
      return (a.nickname || '').localeCompare(b.nickname || '')
    })
  } else {
    participantList.sort(() => Math.random() - 0.5)
  }

  const pIds = participantList.map(p => p.id)
  const prefix = teamSize.value === 2 ? 'Duo' : (teamSize.value === 3 ? 'Trio' : 'Équipe')
  const generated = generateBalancedTeams(pIds, teamSize.value, prefix)

  const pMap = new Map(props.participants.map(p => [p.id, p]))

  teamRows.value = generated.map(t => {
    const members: TeamMember[] = t.memberIds.map(mId => {
      const p = pMap.get(mId)
      const stats = participantStandingsMap.value.get(mId)
      return {
        id: mId,
        nickname: p?.nickname || p?.name || 'Joueur',
        avatarUrl: p?.avatarUrl || p?.avatar,
        globalRank: stats?.globalRank,
        totalPoints: stats?.totalPoints
      }
    })

    return {
      id: t.id,
      name: t.name,
      seed: t.seed,
      members,
      rank: '',
      rawScore: '',
      points: 0
    }
  })

  syncRowsFromTeams()
}

async function balanceTeamsAndSaveToDb(shuffle = false) {
  if (!activeGameId.value || !props.tournament) return

  isGeneratingTeams.value = true
  errorMessage.value = ''

  try {
    const res: any = await $fetch(`/api/tournaments/${props.tournament.id}/teams/generate`, {
      method: 'POST',
      body: {
        gameId: activeGameId.value,
        teamSize: teamSize.value,
        autoBalance: !shuffle,
        shuffle,
        saveToDb: true
      }
    })

    if (res.teams) {
      teamRows.value = res.teams.map((t: any) => {
        const members: TeamMember[] = (t.members || []).map((m: any) => {
          const stats = participantStandingsMap.value.get(m.id)
          return {
            id: m.id,
            nickname: m.nickname || m.name || 'Joueur',
            avatarUrl: m.avatarUrl || m.avatar,
            globalRank: stats?.globalRank,
            totalPoints: stats?.totalPoints
          }
        })

        return {
          id: t.id,
          name: t.name,
          seed: t.seed,
          members,
          rank: '',
          rawScore: '',
          points: 0
        }
      })

      syncRowsFromTeams()
      recalculatePoints()
    }
  } catch (err: any) {
    errorMessage.value = err.data?.statusMessage || 'Erreur lors de la génération des équipes.'
  } finally {
    isGeneratingTeams.value = false
  }
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

function onTeamRankChange(team: TeamRow) {
  recalculatePoints()
}

function setTeamRank(team: TeamRow, rankValue: number) {
  team.rank = team.rank === rankValue ? '' : rankValue
  recalculatePoints()
}

function autoRankTeamsByRawScore() {
  // Sort teams with rawScore descending
  const scoredTeams = teamRows.value.filter(t => t.rawScore !== '')
  scoredTeams.sort((a, b) => Number(b.rawScore) - Number(a.rawScore))

  let rank = 1
  for (let i = 0; i < scoredTeams.length; i++) {
    if (i > 0 && Number(scoredTeams[i].rawScore) < Number(scoredTeams[i - 1].rawScore)) {
      rank = i + 1
    }
    scoredTeams[i].rank = rank
  }

  recalculatePoints()
}

function syncRowsFromTeams() {
  const rowMap = new Map(rows.value.map(r => [r.participantId, r]))

  for (const team of teamRows.value) {
    for (const m of team.members) {
      let r = rowMap.get(m.id)
      if (!r) {
        r = {
          participantId: m.id,
          participantName: m.nickname,
          avatar: m.avatarUrl || null,
          isWinner: null,
          rank: team.rank,
          rawScore: team.rawScore,
          points: team.points
        }
        rows.value.push(r)
        rowMap.set(m.id, r)
      } else {
        r.rank = team.rank
        r.rawScore = team.rawScore
        r.points = team.points
      }
    }
  }
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
  } else if (isTeamMode.value) {
    // Scoreboard in Team Mode
    for (const t of teamRows.value) {
      if (t.rank !== '' && Number(t.rank) > 0) {
        const idx = Number(t.rank) - 1
        t.points = scoringRules.value[idx] ?? 0
      } else {
        t.points = 0
      }
    }
    syncRowsFromTeams()
  } else {
    // Scoreboard Solo
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
    if (isTeamMode.value) {
      syncRowsFromTeams()
    }

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
              class="px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer"
              :class="activeGameId === (tg.gameId || tg.game?.id)
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'"
            >
              <component 
                :is="tg.scoringType === 'WIN_LOSE' ? Swords : (tg.scoringType === 'ROUND_ROBIN' ? Shuffle : ListOrdered)" 
                class="w-3.5 h-3.5"
                :class="{
                  'text-rose-400': tg.scoringType === 'WIN_LOSE',
                  'text-cyan-400': tg.scoringType === 'ROUND_ROBIN',
                  'text-amber-400': tg.scoringType !== 'WIN_LOSE' && tg.scoringType !== 'ROUND_ROBIN'
                }"
              />
              <span>{{ tg.game?.name || tg.name }}</span>
              <span 
                class="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase"
                :class="{
                  'bg-rose-950/80 text-rose-300 border border-rose-800': tg.scoringType === 'WIN_LOSE',
                  'bg-cyan-950/80 text-cyan-300 border border-cyan-800': tg.scoringType === 'ROUND_ROBIN',
                  'bg-slate-800 text-slate-300': tg.scoringType !== 'WIN_LOSE' && tg.scoringType !== 'ROUND_ROBIN'
                }"
              >
                {{ tg.scoringType === 'WIN_LOSE' ? 'Gagnant/Perdant' : (tg.scoringType === 'ROUND_ROBIN' ? 'Round-Robin' : 'Scoreboard') }}
              </span>
            </button>
          </div>
        </div>

        <!-- Banner for ROUND_ROBIN mode -->
        <div v-if="activeScoringType === 'ROUND_ROBIN'" class="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <Shuffle class="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div class="text-xs font-bold text-white">Cette épreuve est configurée en mode Tournoi Round-Robin</div>
              <div class="text-[11px] text-cyan-300/80 font-mono">Utilisez le générateur de calendrier officiel et la saisie match-par-match.</div>
            </div>
          </div>
          <button
            type="button"
            @click="emit('openRoundRobin', activeGameId)"
            class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
          >
            <Shuffle class="w-4 h-4" />
            <span>Ouvrir l'Espace Round-Robin</span>
          </button>
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

        <!-- TEAM MODE HEADER & ACTION CONTROLS -->
        <div v-if="isTeamMode" class="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 space-y-3">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
            <div class="flex items-center gap-2 text-amber-300 font-bold">
              <Users class="w-4 h-4 text-amber-400" />
              <span>Format Équipes ({{ teamSize === 2 ? 'Duos 2v2' : (teamSize === 3 ? 'Trios 3v3' : `Squads ${teamSize}v${teamSize}`) }})</span>
              <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                ⚡ Équilibrage 1er + Dernier
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="balanceTeamsAndSaveToDb(false)"
                :disabled="isGeneratingTeams"
                class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                title="Équilibrer les équipes selon le classement général (1er avec dernier, 2e avec avant-dernier...)"
              >
                <Sparkles class="w-3.5 h-3.5 text-amber-400" />
                <span>{{ isGeneratingTeams ? 'Calcul...' : 'Équilibrer (1er + Dernier)' }}</span>
              </button>

              <button
                type="button"
                @click="balanceTeamsAndSaveToDb(true)"
                :disabled="isGeneratingTeams"
                class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono flex items-center gap-1 transition-all disabled:opacity-50"
                title="Tirer les équipes au sort"
              >
                <Shuffle class="w-3.5 h-3.5" />
                <span>Aléatoire</span>
              </button>

              <button
                type="button"
                @click="autoRankTeamsByRawScore"
                class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono flex items-center gap-1 transition-all"
                title="Calculer les rangs à partir du score brut de chaque équipe"
              >
                <Zap class="w-3.5 h-3.5 text-amber-400" />
                <span>Classer par score</span>
              </button>
            </div>
          </div>

          <p class="text-[11px] font-mono text-slate-400">
            Chaque coéquipier recevra automatiquement le nombre de points attribué au rang de son équipe pour cette manche.
          </p>
        </div>

        <!-- Information rule note about Tournament Scale on final Game Rank -->
        <div v-if="!isTeamMode" class="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span class="text-amber-400 font-bold flex items-center gap-1">
            <Trophy class="w-3.5 h-3.5" />
            <span>Score Final du Jeu :</span>
          </span>
          <span class="text-slate-300">
            Total des manches &rarr; Classement du jeu &rarr; Barème du tournoi ($1^{\text{er}}=10\text{pts}, 2^{\text{e}}=8\text{pts}\dots$)
          </span>
        </div>

        <!-- TEAM MODE: LIST OF TEAM CARDS -->
        <div v-if="isTeamMode" class="mt-4 max-h-96 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          <div v-if="errorMessage" class="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
            {{ errorMessage }}
          </div>

          <div
            v-for="team in teamRows"
            :key="team.id || team.seed"
            class="p-3.5 rounded-xl border backdrop-blur-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            :class="{
              'bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]': team.rank === 1,
              'bg-slate-950/90 border-slate-400/50': team.rank === 2,
              'bg-slate-950/90 border-amber-700/50': team.rank === 3,
              'bg-slate-950/80 border-slate-800/90 hover:border-slate-700': !team.rank || team.rank > 3
            }"
          >
            <!-- Left: Team Name & Members -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-2">
                <span class="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono font-black">
                  {{ team.name }}
                </span>
                <span v-if="team.rank" class="text-xs font-mono font-bold text-slate-300">
                  Rang #{{ team.rank }}
                </span>
              </div>

              <!-- Members list with global rank badges -->
              <div class="flex flex-wrap items-center gap-2">
                <div
                  v-for="m in team.members"
                  :key="m.id"
                  class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs"
                >
                  <img :src="m.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.nickname}`" class="w-5 h-5 rounded-full bg-slate-950 shrink-0" />
                  <span class="font-bold text-white">{{ m.nickname }}</span>
                  <span 
                    class="px-1.5 py-0.2 rounded text-[10px] font-mono font-black shrink-0"
                    :class="m.globalRank === 1 ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400 border border-slate-700'"
                  >
                    #{{ m.globalRank || '?' }} ({{ m.totalPoints ?? 0 }} pts)
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: Quick Rank, Numerical Rank, Raw Score & Points -->
            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <!-- Quick Rank Buttons (1 to 5) -->
              <div class="flex items-center gap-1">
                <button
                  v-for="rVal in Math.min(teamRows.length, 5)"
                  :key="rVal"
                  type="button"
                  @click="setTeamRank(team, rVal)"
                  class="w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center"
                  :class="team.rank === rVal
                    ? (rVal === 1 ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-slate-200 text-slate-950 font-black')
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'"
                >
                  {{ rVal }}
                </button>
              </div>

              <!-- Numerical Rank Input -->
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-mono text-slate-400">Rang:</span>
                <input
                  v-model.number="team.rank"
                  @input="onTeamRankChange(team)"
                  type="number"
                  min="1"
                  :max="teamRows.length"
                  placeholder="-"
                  class="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 focus:border-amber-500 text-white font-mono font-bold text-xs text-center"
                />
              </div>

              <!-- Raw Score Input -->
              <div class="flex items-center gap-1.5">
                <span class="text-[11px] font-mono text-slate-400">Score:</span>
                <input
                  v-model.number="team.rawScore"
                  @input="syncRowsFromTeams"
                  type="number"
                  step="any"
                  placeholder="opt."
                  class="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs text-center"
                />
              </div>

              <!-- Points Gained Badge -->
              <div class="min-w-16 text-right">
                <span
                  class="inline-block px-2.5 py-1 rounded-lg font-bold text-xs font-mono"
                  :class="team.points > 0
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-600'"
                >
                  +{{ team.points }} pts
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- SOLO MODE: Table of participants -->
        <div v-else class="mt-4 max-h-80 overflow-y-auto pr-1">
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

