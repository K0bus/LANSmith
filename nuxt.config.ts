// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  typescript: {
    strict: true,
    typeCheck: false
  },
  runtimeConfig: {
    twitchClientId: process.env.TWITCH_CLIENT_ID || '',
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'LANSmith'
    }
  },
  app: {
    head: {
      title: 'LANSmith - Hardware Compatibility & LAN Tournament Manager',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Gestionnaire de LAN party : audit de compatibilité hardware des configs et leaderboard de tournoi multi-jeux en direct.' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap' }
      ]
    }
  },
  css: [
    '~/assets/css/main.css'
  ]
})
