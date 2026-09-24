<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { LayoutGrid, Users, Gamepad2, Trophy, ShieldCheck, Activity, Terminal, Gauge } from 'lucide-vue-next'

const route = useRoute()
const currentTime = ref('')

onMounted(() => {
  const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  updateTime()
  setInterval(updateTime, 1000)
})

const navItems = [
  { name: 'Matrice Hardware', path: '/', icon: LayoutGrid },
  { name: 'Parc & Joueurs', path: '/participants', icon: Users },
  { name: 'Catalogue Jeux', path: '/games', icon: Gamepad2 },
  { name: 'Benchmarks Hardware', path: '/admin/hardware', icon: Gauge },
  { name: 'Tournoi & Leaderboard', path: '/tournaments', icon: Trophy }
]
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-slate-950">
    <!-- Top Navigation Bar -->
    <header class="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="flex items-center gap-2.5 group">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 p-0.5 shadow-glow-emerald transition-transform group-hover:scale-105">
                <div class="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity class="w-5 h-5 text-brand-400" />
                </div>
              </div>
              <div>
                <span class="text-xl font-extrabold tracking-tight text-white font-mono flex items-center gap-1">
                  LAN<span class="text-brand-400">SMITH</span>
                </span>
                <span class="block text-[10px] font-mono tracking-widest text-slate-500 uppercase -mt-1">
                  Rig & Tournament Forge
                </span>
              </div>
            </NuxtLink>
          </div>

          <!-- Center Navigation Tabs -->
          <nav class="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
            <NuxtLink
              v-for="item in navItems"
              :key="item.path"
              :to="item.path"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              :class="route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path))
                ? 'bg-gradient-to-r from-brand-500/20 to-cyan-500/20 text-brand-300 border border-brand-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
            >
              <component :is="item.icon" class="w-4 h-4" />
              <span>{{ item.name }}</span>
            </NuxtLink>
          </nav>

          <!-- Right Status Bar -->
          <div class="flex items-center gap-3 font-mono text-xs">
            <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
              <span class="w-2 h-2 rounded-full bg-brand-400 animate-ping" />
              <span class="text-[11px] text-slate-300">LAN PARTY ONLINE</span>
            </div>

            <div class="px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-brand-400 font-bold text-xs">
              {{ currentTime || '12:00:00' }}
            </div>
          </div>
        </div>

        <!-- Mobile Navigation Row -->
        <nav class="flex md:hidden items-center justify-around py-2 border-t border-slate-800/60 overflow-x-auto gap-1">
          <NuxtLink
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="flex flex-col items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all shrink-0"
            :class="route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path))
              ? 'text-brand-400 bg-slate-900'
              : 'text-slate-400'"
          >
            <component :is="item.icon" class="w-4 h-4" />
            <span>{{ item.name }}</span>
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Main Content View -->
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-slate-800/80 bg-slate-950 py-6 text-xs text-slate-500 font-mono">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <ShieldCheck class="w-4 h-4 text-brand-400" />
          <span>LANSmith v1.0 • Nuxt 3 Full-Stack • Prisma SQLite • IGDB API</span>
        </div>
        <div class="text-slate-400">
          Orga Hub • Strict Hardware Matching & Live Leaderboard
        </div>
      </div>
    </footer>
  </div>
</template>
