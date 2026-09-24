interface TwitchTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TwitchTokenCache | null = null;

export interface IgdbGameSearchResult {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  genres: string;
  summary: string;
  totalRatingCount?: number;
  steamAppId?: string;
  steamUrl?: string;
  minCpuScore: number;
  recCpuScore: number;
  minGpuScore: number;
  recGpuScore: number;
  minRamGb: number;
  recRamGb: number;
  minVramGb: number;
  recVramGb: number;
  rawRequirements?: {
    minCpu?: string;
    minGpu?: string;
    recCpu?: string;
    recGpu?: string;
    minRamGb?: number;
    recRamGb?: number;
    minVramGb?: number;
    recVramGb?: number;
    minOs?: string;
    recOs?: string;
    minStorage?: string;
    recStorage?: string;
    minDirectx?: string;
    recDirectx?: string;
    minimumHtml?: string;
    recommendedHtml?: string;
    minimumText?: string;
    recommendedText?: string;
    summary?: string;
  };
  source: 'IGDB' | 'LOCAL_PRESET';
}

// Rich offline library with calibrated benchmark requirements
export const CURATED_LAN_GAMES: IgdbGameSearchResult[] = [
  {
    id: 19441,
    name: 'TrackMania Nations Forever',
    slug: 'trackmania-nations-forever',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co204m.jpg',
    genres: 'Racing, Arcade',
    summary: 'Le classique intemporel des LAN party. Ultra fluide même sur des PC très modestes.',
    minCpuScore: 1500,
    recCpuScore: 2500,
    minGpuScore: 2500,
    recGpuScore: 6000,
    minRamGb: 2,
    recRamGb: 4,
    minVramGb: 1,
    recVramGb: 2,
    rawRequirements: {
      minCpu: 'Pentium 4 1.6GHz / AthlonXP 1600+',
      minGpu: 'GeForce GT 1030 / Intel HD 4000',
      recCpu: 'Intel Core i3 / Ryzen 3',
      recGpu: 'GeForce GTX 1050 / RX 560',
      summary: '1080p 60fps garanti sur n’importe quelle configuration moderne.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 247854,
    name: 'Counter-Strike 2',
    slug: 'counter-strike-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7d6a.jpg',
    genres: 'Shooter, Tactical, FPS',
    summary: 'Le FPS compétitif phare sur Source 2. Requiert un GPU et CPU récents pour un 144Hz stable.',
    minCpuScore: 3000,
    recCpuScore: 4500,
    minGpuScore: 10000,
    recGpuScore: 20000,
    minRamGb: 8,
    recRamGb: 16,
    minVramGb: 4,
    recVramGb: 8,
    rawRequirements: {
      minCpu: 'Intel Core i5-7500 / AMD Ryzen 5 1600',
      minGpu: 'GeForce GTX 1060 6GB / AMD RX 580',
      recCpu: 'Intel Core i5-13600K / Ryzen 7 7800X3D',
      recGpu: 'GeForce RTX 3060 Ti / RTX 4060',
      summary: 'Framerate compétitif pour écrans 144Hz+ et fumigènes volumétriques.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 11198,
    name: 'Rocket League',
    slug: 'rocket-league',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg',
    genres: 'Sport, Arcade, Vehicular Combat',
    summary: 'Football avec des voitures à propulsion supersonique. Excellent en 2v2 et 3v3.',
    minCpuScore: 2000,
    recCpuScore: 3200,
    minGpuScore: 6000,
    recGpuScore: 12000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 2,
    recVramGb: 4,
    rawRequirements: {
      minCpu: '2.5 GHz Dual Core',
      minGpu: 'NVIDIA GeForce GTX 760 / AMD Radeon R7 260X',
      recCpu: '3.0+ GHz Quad Core / i5-10400F',
      recGpu: 'NVIDIA GeForce GTX 1060 / AMD Radeon RX 470',
      summary: 'Très bien optimisé sous Unreal Engine.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 125174,
    name: 'VALORANT',
    slug: 'valorant',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg',
    genres: 'Shooter, Tactical, Hero Shooter',
    summary: 'FPS tactique 5v5 compétitif optimisé pour fonctionner sur une large gamme de machines.',
    minCpuScore: 2200,
    recCpuScore: 3800,
    minGpuScore: 6000,
    recGpuScore: 15000,
    minRamGb: 4,
    recRamGb: 16,
    minVramGb: 2,
    recVramGb: 6,
    rawRequirements: {
      minCpu: 'Intel i3-4150 / AMD Ryzen 3 1200',
      minGpu: 'GeForce GT 730 / GTX 1050 Ti',
      recCpu: 'Intel i5-9400F / AMD Ryzen 5 3600',
      recGpu: 'GeForce GTX 1660 / RTX 3060',
      summary: 'Conçu pour tourner à 144+ FPS sur matériel intermédiaire.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 115,
    name: 'League of Legends',
    slug: 'league-of-legends',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co49x5.jpg',
    genres: 'MOBA, Strategy',
    summary: 'Le MOBA le plus joué au monde. Très accessible niveau configuration requise.',
    minCpuScore: 1800,
    recCpuScore: 2800,
    minGpuScore: 3500,
    recGpuScore: 8000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 1,
    recVramGb: 3,
    rawRequirements: {
      minCpu: 'Intel Core i3-530 / AMD A6-3650',
      minGpu: 'GeForce 9600GT / AMD HD 6570',
      recCpu: 'Intel Core i5-3300 / AMD Ryzen 3 1200',
      recGpu: 'GeForce GTX 560 / AMD Radeon HD 6950',
      summary: 'Tourne facilement sur les iGPU récents.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 233,
    name: 'Left 4 Dead 2',
    slug: 'left-4-dead-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg',
    genres: 'Co-op, FPS, Survival Horror',
    summary: 'Le jeu coopératif par excellence à 4 joueurs contre des hordes de zombies.',
    minCpuScore: 1800,
    recCpuScore: 2800,
    minGpuScore: 4000,
    recGpuScore: 9000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 1,
    recVramGb: 3,
    rawRequirements: {
      minCpu: 'Pentium 4 3.0GHz / Dual Core 2.0',
      minGpu: 'DirectX 9 compatible video card with 128 MB',
      recCpu: 'Intel Core 2 Quad / i5-7400',
      recGpu: 'GeForce GTX 750 Ti / GTX 1050',
      summary: 'Moteur Source 1 très léger et fluide.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 2933,
    name: 'FlatOut 2',
    slug: 'flatout-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2k9c.jpg',
    genres: 'Racing, Demolition Derby',
    summary: 'Duels de tôles froissées et mini-jeux de cascades hilarants jusqu’à 8 joueurs.',
    minCpuScore: 1200,
    recCpuScore: 2000,
    minGpuScore: 2000,
    recGpuScore: 5000,
    minRamGb: 2,
    recRamGb: 4,
    minVramGb: 1,
    recVramGb: 2,
    rawRequirements: {
      minCpu: 'Pentium 4 2.0 GHz',
      minGpu: 'GeForce 6600 / Radeon X1300',
      recCpu: 'Pentium 4 2.8 GHz / Core 2 Duo',
      recGpu: 'GeForce 7800 / Radeon X1800',
      summary: 'Parfait pour les vieilles machines ou les laptops bureautiques.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 1047,
    name: 'Blur',
    slug: 'blur',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3q.jpg',
    genres: 'Racing, Action Arcade',
    summary: 'Le "Mario Kart avec de vraies voitures" : nitro, boucliers et éclairs à 20 en réseau.',
    minCpuScore: 2200,
    recCpuScore: 3200,
    minGpuScore: 6000,
    recGpuScore: 12000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 2,
    recVramGb: 4,
    rawRequirements: {
      minCpu: 'Intel Pentium D Dual Core 3.4GHz',
      minGpu: 'NVIDIA GeForce 7800GT / ATI Radeon X1800XT',
      recCpu: 'Intel Core 2 Duo E4300 / AMD Athlon 64 X2 4000+',
      recGpu: 'NVIDIA GeForce 9800GTX / ATI Radeon HD 4850',
      summary: '60 FPS stables recommandés pour la réactivité des bonus.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 119280,
    name: 'Age of Empires II: Definitive Edition',
    slug: 'age-of-empires-ii-definitive-edition',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0s.jpg',
    genres: 'RTS, Strategy, Historical',
    summary: 'La version remasterisée du chef-d’œuvre RTS avec support multijoueur moderne.',
    minCpuScore: 2500,
    recCpuScore: 3800,
    minGpuScore: 6000,
    recGpuScore: 14000,
    minRamGb: 8,
    recRamGb: 16,
    minVramGb: 2,
    recVramGb: 4,
    rawRequirements: {
      minCpu: 'Intel Core 2 Duo or AMD Athlon 64x2 5600+',
      minGpu: 'Nvidia GeForce GT 420 or ATI Radeon HD 6850',
      recCpu: '2.4 GHz i5 or greater (4 cores) or AMD equivalent',
      recGpu: 'Nvidia GTX 650 or AMD HD 5850 or better',
      summary: 'Demande plus de RAM en fin de partie 4v4 avec 200+ unités.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 480,
    name: 'Unreal Tournament 2004',
    slug: 'unreal-tournament-2004',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2vpt.jpg',
    genres: 'Arena FPS, Fast-Paced',
    summary: 'Instagib, Capture The Flag et mode Onslaught légendaire pour des nuits blanches.',
    minCpuScore: 1200,
    recCpuScore: 2000,
    minGpuScore: 2000,
    recGpuScore: 5000,
    minRamGb: 2,
    recRamGb: 4,
    minVramGb: 1,
    recVramGb: 2,
    rawRequirements: {
      minCpu: 'Pentium III 1.0 GHz',
      minGpu: 'NVIDIA GeForce 2 / ATI Radeon',
      recCpu: 'Pentium 4 1.5 GHz',
      recGpu: 'GeForce 4 / Radeon 8500',
      summary: 'Tourne à 200+ FPS sur n’importe quelle machine.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 19163,
    name: 'Worms W.M.D',
    slug: 'worms-w-m-d',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co204a.jpg',
    genres: 'Turn-based Strategy, Artillery',
    summary: 'Stratégie au tour par tour déjantée avec armes loufoques et destructions de terrain.',
    minCpuScore: 1800,
    recCpuScore: 2800,
    minGpuScore: 4000,
    recGpuScore: 8000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 1,
    recVramGb: 2,
    rawRequirements: {
      minCpu: 'Intel Dual Core 6600 2.4GHz',
      minGpu: 'Intel HD 4400, GeForce GTX 280, AMD Radeon HD 7750',
      recCpu: 'i5-2500k@3.3GHz, AMD FX 6300 3.5GHz',
      recGpu: 'GeForce GTX 750, AMD R7 370',
      summary: 'Très accessible en multijoueur tour par tour.'
    },
    source: 'LOCAL_PRESET'
  },
  {
    id: 28540,
    name: 'Overcooked! 2',
    slug: 'overcooked-2',
    coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1h9m.jpg',
    genres: 'Co-op, Party, Casual',
    summary: 'Cuisine frénétique et chaotique jusqu’à 4 joueurs en coopération ou duel.',
    minCpuScore: 1800,
    recCpuScore: 3000,
    minGpuScore: 4500,
    recGpuScore: 9000,
    minRamGb: 4,
    recRamGb: 8,
    minVramGb: 2,
    recVramGb: 4,
    rawRequirements: {
      minCpu: 'Intel Core i3-2100 / AMD A8-5600K',
      minGpu: 'GeForce GTX 630 / Radeon HD 6570',
      recCpu: 'Intel Core i5-650 / AMD A10-5800K',
      recGpu: 'Nvidia GeForce GTX 650 / Radeon HD 7510',
      summary: 'Ambiance party-game garantie sans surcharge GPU.'
    },
    source: 'LOCAL_PRESET'
  }
];

export async function getTwitchAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string | null> {
  if (!clientId || !clientSecret || clientId.includes('your_twitch')) {
    return null;
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  try {
    const res = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    });

    if (res.ok) {
      const data = await res.json();
      tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + data.expires_in * 1000
      };
      return data.access_token;
    }
  } catch (err) {
    console.warn(
      '[IGDB] Failed to obtain Twitch OAuth2 token, fallback to local preset mode:',
      err
    );
  }

  return null;
}

import { extractSteamAppId, fetchSteamRequirements } from './steam';

// Acronym and common gaming shortcut dictionary
const ACRONYMS: Record<string, string> = {
  'cs': 'Counter-Strike',
  'csgo': 'Counter-Strike',
  'cs2': 'Counter-Strike 2',
  'rl': 'Rocket League',
  'aoe': 'Age of Empires',
  'aoe2': 'Age of Empires II',
  'aoe4': 'Age of Empires IV',
  'l4d': 'Left 4 Dead',
  'l4d2': 'Left 4 Dead 2',
  'gta': 'Grand Theft Auto',
  'gta v': 'Grand Theft Auto V',
  'gta 5': 'Grand Theft Auto V',
  'cod': 'Call of Duty',
  'mw': 'Modern Warfare',
  'mw2': 'Modern Warfare 2',
  'warzone': 'Call of Duty Warzone',
  'bf': 'Battlefield',
  'bf2042': 'Battlefield 2042',
  'r6': 'Rainbow Six Siege',
  'r6s': 'Rainbow Six Siege',
  'siege': 'Rainbow Six Siege',
  'wow': 'World of Warcraft',
  'lol': 'League of Legends',
  'ff': 'Final Fantasy',
  'ff7': 'Final Fantasy VII',
  'mc': 'Minecraft',
  'poe': 'Path of Exile',
  'tes': 'The Elder Scrolls',
  'ac': 'Assassin\'s Creed',
  'ut': 'Unreal Tournament',
  'ut2004': 'Unreal Tournament 2004',
  'tf2': 'Team Fortress 2',
  'sc2': 'StarCraft II',
  'pubg': 'PUBG: Battlegrounds',
  'val': 'VALORANT',
  'tmnf': 'TrackMania Nations Forever',
  'tm': 'TrackMania'
};

const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'in', 'and', 'or', 'to', 'for', 'with', 'on', 'at']);

/**
 * Calculates Levenshtein distance between two strings for typo scoring.
 */
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[bn][an];
}

/**
 * Computes relevance score to rank search results by closeness to user query.
 */
function calculateRelevance(gameName: string, query: string): number {
  const nameNorm = gameName.toLowerCase().trim();
  const queryNorm = query.toLowerCase().trim();

  if (nameNorm === queryNorm) return 3000;
  if (nameNorm.startsWith(queryNorm)) return 2500 - (nameNorm.length - queryNorm.length);
  if (nameNorm.includes(queryNorm)) return 2000 - (nameNorm.length - queryNorm.length);

  const words = nameNorm.split(/[\s:\-\_]+/);
  const qWords = queryNorm.split(/[\s:\-\_]+/).filter((w) => w.length > 0);
  let wordMatches = 0;
  for (const qw of qWords) {
    if (words.some((w) => w.startsWith(qw) || qw.startsWith(w))) {
      wordMatches++;
    }
  }

  // Multi-token full match bonus
  if (qWords.length > 1 && wordMatches === qWords.length) {
    return 1800 - nameNorm.length;
  }

  if (wordMatches > 0) {
    return wordMatches * 300 - nameNorm.length;
  }

  const dist = levenshtein(nameNorm, queryNorm);
  const maxLen = Math.max(nameNorm.length, queryNorm.length);
  const similarity = 1 - dist / (maxLen || 1);
  return similarity * 200;
}

/**
 * Helper to determine if an IGDB game item is a DLC, Expansion, Addon, Edition bundle, or soundtrack.
 */
function isDLC(game: any): boolean {
  if (game.game_type !== undefined && game.game_type !== 0) {
    return true;
  }
  if (game.category !== undefined && game.category !== 0 && game.category !== 8 && game.category !== 9) {
    return true;
  }
  if (game.parent_game || game.version_parent) {
    return true;
  }
  const nameLower = (game.name || '').toLowerCase();
  if (
    nameLower.includes(' dlc') ||
    nameLower.includes('season pass') ||
    nameLower.includes('expansion pack') ||
    nameLower.includes('soundtrack') ||
    nameLower.includes('add-on') ||
    nameLower.includes('skin pack') ||
    nameLower.includes(' bundle') ||
    nameLower.includes(' artbook')
  ) {
    return true;
  }
  return false;
}

export async function searchIgdbGames(
  query: string,
  clientId: string,
  clientSecret: string
): Promise<IgdbGameSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return CURATED_LAN_GAMES.slice(0, 12);

  const lowerQuery = trimmedQuery.toLowerCase();
  const expandedQuery = ACRONYMS[lowerQuery] || trimmedQuery;

  const token = await getTwitchAccessToken(clientId, clientSecret);

  if (token && clientId) {
    try {
      const fields = `id, name, slug, summary, cover.url, total_rating_count, rating_count, follows, category, game_type, parent_game, version_parent, external_games.category, external_games.uid, external_games.url`;

      const tokens = expandedQuery.split(/\s+/).filter((t) => t.length > 0);
      const significantTokens = tokens.filter((t) => !STOP_WORDS.has(t.toLowerCase()));

      const executeFetch = async (bodyQuery: string): Promise<any[]> => {
        try {
          const res = await fetch('https://api.igdb.com/v4/games', {
            method: 'POST',
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${token}`,
              'Content-Type': 'text/plain'
            },
            body: bodyQuery
          });
          if (!res.ok) {
            return [];
          }
          const json = await res.json();
          return Array.isArray(json) ? json : [];
        } catch (err) {
          console.warn('[IGDB Fetch Strategy Warning]', err);
          return [];
        }
      };

      const promises: Promise<any[]>[] = [];

      // Strategy 1: Full-Text IGDB search query
      const sanitized = expandedQuery.replace(/"/g, '\\"');
      promises.push(
        executeFetch(`
          search "${sanitized}";
          fields ${fields};
          limit 30;
        `)
      );

      // Strategy 2: Joined search for multi-token inputs (e.g. "v ris" -> "vris", "x com" -> "xcom")
      if (tokens.length >= 2) {
        const joined = tokens.join('').replace(/"/g, '\\"');
        promises.push(
          executeFetch(`
            search "${joined}";
            fields ${fields};
            limit 25;
          `)
        );
      }

      // Strategy 3: Single token space-split variations for unspaced words (e.g. "vrising" -> "v rising", "eldenring" -> "elden ring")
      if (tokens.length === 1 && tokens[0].length >= 3) {
        const word = tokens[0];
        const split1 = (word.slice(0, 1) + ' ' + word.slice(1)).replace(/"/g, '\\"');
        promises.push(
          executeFetch(`
            search "${split1}";
            fields ${fields};
            limit 20;
          `)
        );

        for (let splitIdx = 3; splitIdx <= Math.min(6, word.length - 3); splitIdx++) {
          const s = (word.slice(0, splitIdx) + ' ' + word.slice(splitIdx)).replace(/"/g, '\\"');
          promises.push(
            executeFetch(`
              search "${s}";
              fields ${fields};
              limit 20;
            `)
          );
        }
      }

      // Strategy 4: Multi-Token AND wildcard query sorted by popularity
      const cleanTokens = tokens
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((t) => t.length >= 1);
      if (cleanTokens.length >= 2) {
        const whereAndClause = cleanTokens.map((t) => `name ~ *"${t}"*`).join(' & ');
        promises.push(
          executeFetch(`
            fields ${fields};
            where ${whereAndClause} & category = null & parent_game = null;
            sort rating_count desc;
            limit 30;
          `)
        );
      }

      // Strategy 5: Primary token substring wildcard query sorted by popularity
      const sigTokensClean = significantTokens
        .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
        .filter((t) => t.length >= 2);
      const mainToken = sigTokensClean[0] || cleanTokens.find((t) => t.length >= 2);
      if (mainToken && mainToken.length >= 2) {
        promises.push(
          executeFetch(`
            fields ${fields};
            where name ~ *"${mainToken}"* & category = null & parent_game = null;
            sort rating_count desc;
            limit 30;
          `)
        );
      }

      const resultsList = await Promise.all(promises);

      // Deduplicate games by IGDB ID
      const map = new Map<number, any>();
      for (const list of resultsList) {
        for (const game of list) {
          if (game && game.id && !map.has(game.id)) {
            map.set(game.id, game);
          }
        }
      }

      let allGames = Array.from(map.values());

      // Filter out DLCs / expansions / addons
      allGames = allGames.filter((g) => !isDLC(g));

      // Sort games by relevance score & popularity metrics
      allGames.sort((a, b) => {
        const scoreA =
          calculateRelevance(a.name || '', expandedQuery) +
          (a.rating_count ? Math.min(a.rating_count, 100) : 0) +
          (a.follows ? Math.min(a.follows, 100) : 0);
        const scoreB =
          calculateRelevance(b.name || '', expandedQuery) +
          (b.rating_count ? Math.min(b.rating_count, 100) : 0) +
          (b.follows ? Math.min(b.follows, 100) : 0);
        return scoreB - scoreA;
      });

      // Take the top 15 candidates for enrichment
      const topCandidates = allGames.slice(0, 15);

      if (topCandidates.length > 0) {
        const enrichedResults = await Promise.all(
          topCandidates.map(async (item) => {
            let cover = item.cover?.url || null;
            if (cover && cover.startsWith('//')) {
              cover = 'https:' + cover.replace('/t_thumb/', '/t_cover_big/');
            }

            const genresStr = Array.isArray(item.genres)
              ? item.genres.map((g: any) => g.name).join(', ')
              : 'Jeu Vidéo';

            // Default baseline requirement estimates
            let minRam = 8;
            let recRam = 16;
            let minVram = 3;
            let recVram = 6;
            let minGpu = 8000;
            let recGpu = 16000;
            let minCpu = 2500;
            let recCpu = 3800;

            const lowerName = (item.name || '').toLowerCase();
            if (
              lowerName.includes('trackmania') ||
              lowerName.includes('quake') ||
              lowerName.includes('flatout') ||
              lowerName.includes('unreal') ||
              lowerName.includes('worms')
            ) {
              minRam = 2;
              recRam = 4;
              minVram = 1;
              recVram = 2;
              minGpu = 2500;
              recGpu = 6000;
              minCpu = 1500;
              recCpu = 2500;
            } else if (
              lowerName.includes('cs2') ||
              lowerName.includes('counter-strike 2') ||
              lowerName.includes('cyberpunk') ||
              lowerName.includes('cod') ||
              lowerName.includes('warzone')
            ) {
              minRam = 12;
              recRam = 16;
              minVram = 6;
              recVram = 10;
              minGpu = 12000;
              recGpu = 25000;
              minCpu = 3200;
              recCpu = 4500;
            } else if (
              lowerName.includes('rocket league') ||
              lowerName.includes('valorant') ||
              lowerName.includes('league of legends') ||
              lowerName.includes('left 4 dead')
            ) {
              minRam = 4;
              recRam = 8;
              minVram = 2;
              recVram = 4;
              minGpu = 6000;
              recGpu = 12000;
              minCpu = 2000;
              recCpu = 3400;
            }

            // Extraction of Steam App ID & enrichment via Steam API
            const steamInfo = extractSteamAppId(item.external_games);
            let steamReqs = null;
            if (steamInfo?.appId) {
              steamReqs = await fetchSteamRequirements(steamInfo.appId);
            }

            const minParsed = steamReqs?.minimum;
            const recParsed = steamReqs?.recommended;

            if (minParsed?.ramGb) minRam = minParsed.ramGb;
            if (recParsed?.ramGb) recRam = recParsed.ramGb;
            if (minParsed?.vramGb) minVram = minParsed.vramGb;
            if (recParsed?.vramGb) recVram = recParsed.vramGb;

            if (minParsed?.matchedCpu) minCpu = minParsed.matchedCpu.score;
            if (recParsed?.matchedCpu) recCpu = recParsed.matchedCpu.score;
            if (minParsed?.matchedGpu) minGpu = minParsed.matchedGpu.score;
            if (recParsed?.matchedGpu) recGpu = recParsed.matchedGpu.score;

            return {
              id: item.id,
              name: item.name,
              slug: item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              coverUrl: cover,
              genres: genresStr,
              summary: item.summary || 'Jeu récupéré via la base de données IGDB.',
              totalRatingCount: item.total_rating_count || item.rating_count,
              steamAppId: steamInfo?.appId,
              steamUrl: steamInfo?.url,
              minCpuScore: minCpu,
              recCpuScore: recCpu,
              minGpuScore: minGpu,
              recGpuScore: recGpu,
              minRamGb: minRam,
              recRamGb: recRam,
              minVramGb: minVram,
              recVramGb: recVram,
              rawRequirements: {
                minCpu: minParsed?.matchedCpu?.name || minParsed?.cpu,
                minGpu: minParsed?.matchedGpu?.name || minParsed?.gpu,
                recCpu: recParsed?.matchedCpu?.name || recParsed?.cpu,
                recGpu: recParsed?.matchedGpu?.name || recParsed?.gpu,
                minRamGb: minParsed?.ramGb,
                recRamGb: recParsed?.ramGb,
                minVramGb: minParsed?.vramGb,
                recVramGb: recParsed?.vramGb,
                minOs: minParsed?.os,
                recOs: recParsed?.os,
                minStorage: minParsed?.storage,
                recStorage: recParsed?.storage,
                minDirectx: minParsed?.directx,
                recDirectx: recParsed?.directx,
                minimumHtml: minParsed?.rawHtml,
                recommendedHtml: recParsed?.rawHtml,
                minimumText: minParsed?.rawText,
                recommendedText: recParsed?.rawText,
                summary:
                  item.summary ||
                  (minParsed?.rawText
                    ? `Prérequis Steam : ${minParsed.rawText}`
                    : 'Spécifications estimées selon le profil du jeu.')
              },
              source: 'IGDB' as const
            };
          })
        );

        return enrichedResults;
      }
    } catch (error) {
      console.warn('[IGDB API Error, falling back to local library]', error);
    }
  }

  // Fallback to searching curated LAN presets with fuzzy scoring
  const sortedPresets = [...CURATED_LAN_GAMES].map((g) => ({
    game: g,
    score: calculateRelevance(g.name, expandedQuery)
  }));

  sortedPresets.sort((a, b) => b.score - a.score);

  const matchedPresets = sortedPresets
    .filter(
      (item) =>
        item.score > 100 ||
        item.game.name.toLowerCase().includes(lowerQuery) ||
        item.game.genres.toLowerCase().includes(lowerQuery) ||
        item.game.summary.toLowerCase().includes(lowerQuery)
    )
    .map((item) => item.game);

  return matchedPresets.length > 0 ? matchedPresets : CURATED_LAN_GAMES.slice(0, 8);
}
