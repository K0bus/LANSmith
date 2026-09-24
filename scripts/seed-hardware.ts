import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(nvidia|geforce|amd|radeon|intel|processor|graphics|core|series)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function calculateGpuTier(score: number): number {
  if (score >= 20000) return 5;
  if (score >= 12000) return 4;
  if (score >= 6000) return 3;
  if (score >= 3500) return 2;
  return 1;
}

function calculateCpuTier(score: number): number {
  if (score >= 4200) return 5;
  if (score >= 3400) return 4;
  if (score >= 2700) return 3;
  if (score >= 2000) return 2;
  return 1;
}

interface BenchmarkItem {
  name: string;
  score: number;
}

const FALLBACK_GPUS: BenchmarkItem[] = [
  { name: 'NVIDIA GeForce RTX 4090', score: 38895 },
  { name: 'NVIDIA GeForce RTX 4080 SUPER', score: 34500 },
  { name: 'NVIDIA GeForce RTX 4080', score: 34200 },
  { name: 'AMD Radeon RX 7900 XTX', score: 31000 },
  { name: 'NVIDIA GeForce RTX 4070 Ti SUPER', score: 31500 },
  { name: 'AMD Radeon RX 7900 XT', score: 28500 },
  { name: 'NVIDIA GeForce RTX 4070 SUPER', score: 29800 },
  { name: 'NVIDIA GeForce RTX 4070', score: 26800 },
  { name: 'AMD Radeon RX 7800 XT', score: 24200 },
  { name: 'NVIDIA GeForce RTX 3080 Ti', score: 27000 },
  { name: 'NVIDIA GeForce RTX 3080', score: 24900 },
  { name: 'AMD Radeon RX 6800 XT', score: 23500 },
  { name: 'NVIDIA GeForce RTX 4060 Ti', score: 22600 },
  { name: 'NVIDIA GeForce RTX 3070', score: 22100 },
  { name: 'AMD Radeon RX 6700 XT', score: 19500 },
  { name: 'NVIDIA GeForce RTX 4060', score: 19400 },
  { name: 'NVIDIA GeForce RTX 3060 Ti', score: 20200 },
  { name: 'NVIDIA GeForce RTX 2080 Ti', score: 21800 },
  { name: 'AMD Radeon RX 7600', score: 16200 },
  { name: 'Intel Arc A770', score: 15400 },
  { name: 'NVIDIA GeForce RTX 3060', score: 17100 },
  { name: 'NVIDIA GeForce RTX 2060 SUPER', score: 16500 },
  { name: 'NVIDIA GeForce RTX 2060', score: 14100 },
  { name: 'AMD Radeon RX 6600', score: 15000 },
  { name: 'NVIDIA GeForce GTX 1080 Ti', score: 18400 },
  { name: 'NVIDIA GeForce GTX 1080', score: 15400 },
  { name: 'NVIDIA GeForce GTX 1660 SUPER', score: 12700 },
  { name: 'NVIDIA GeForce GTX 1660', score: 11600 },
  { name: 'AMD Radeon RX 580', score: 8700 },
  { name: 'NVIDIA GeForce GTX 1060 6GB', score: 10100 },
  { name: 'NVIDIA GeForce GTX 1060 3GB', score: 9500 },
  { name: 'NVIDIA GeForce GTX 1650', score: 7800 },
  { name: 'NVIDIA GeForce GTX 1050 Ti', score: 6300 },
  { name: 'AMD Radeon RX 560', score: 3600 },
  { name: 'NVIDIA GeForce GT 1030', score: 2500 }
];

const FALLBACK_CPUS: BenchmarkItem[] = [
  { name: 'Intel Core i9-14900KS', score: 4850 },
  { name: 'Intel Core i9-14900K', score: 4780 },
  { name: 'Intel Core i7-14700K', score: 4620 },
  { name: 'AMD Ryzen 7 7800X3D', score: 4550 },
  { name: 'Intel Core i9-13900K', score: 4680 },
  { name: 'AMD Ryzen 9 7950X3D', score: 4490 },
  { name: 'Intel Core i5-14600K', score: 4480 },
  { name: 'AMD Ryzen 9 7900X3D', score: 4420 },
  { name: 'Intel Core i7-13700K', score: 4500 },
  { name: 'Intel Core i5-13600K', score: 4320 },
  { name: 'AMD Ryzen 7 7700X', score: 4210 },
  { name: 'AMD Ryzen 5 7600X', score: 4180 },
  { name: 'Intel Core i9-12900K', score: 4120 },
  { name: 'Intel Core i7-12700K', score: 4010 },
  { name: 'AMD Ryzen 7 5800X3D', score: 3750 },
  { name: 'Intel Core i5-13400F', score: 3820 },
  { name: 'Intel Core i5-12600K', score: 3950 },
  { name: 'Intel Core i5-12400F', score: 3520 },
  { name: 'AMD Ryzen 5 5600X', score: 3380 },
  { name: 'AMD Ryzen 7 5700X', score: 3400 },
  { name: 'Intel Core i7-11700K', score: 3500 },
  { name: 'Intel Core i5-11400F', score: 3100 },
  { name: 'Intel Core i7-10700K', score: 3080 },
  { name: 'AMD Ryzen 5 3600', score: 2580 },
  { name: 'Intel Core i3-12100F', score: 3540 },
  { name: 'Intel Core i7-9700K', score: 2900 },
  { name: 'Intel Core i7-8700K', score: 2750 },
  { name: 'AMD Ryzen 5 2600', score: 2240 },
  { name: 'Intel Core i5-8400', score: 2320 },
  { name: 'Intel Core i7-7700K', score: 2540 },
  { name: 'Intel Core i5-7400', score: 1950 },
  { name: 'Intel Core i3-8100', score: 2150 }
];

/**
 * Récupère l'intégralité des cartes graphiques depuis la GPU Mega Page de PassMark
 * (https://www.videocardbenchmark.net/GPU_mega_page.html) avec toutes les entrées (ALL)
 */
async function scrapePassmarkGpuMegaPage(): Promise<BenchmarkItem[]> {
  try {
    console.log('📡 Initialisation de session sur PassMark GPU Mega Page...');
    const pageRes = await fetch('https://www.videocardbenchmark.net/GPU_mega_page.html', {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!pageRes.ok) {
      console.warn(`[SCRAPER] HTTP ${pageRes.status} from GPU_mega_page.html`);
      return [];
    }

    const cookies = pageRes.headers.getSetCookie
      ? pageRes.headers.getSetCookie()
      : [pageRes.headers.get('set-cookie') || ''];
    const cookieHeader = cookies
      .map((c) => c.split(';')[0])
      .filter(Boolean)
      .join('; ');

    console.log('📡 Téléchargement du jeu de données GPU complet (ALL entries)...');
    const dataRes = await fetch(`https://www.videocardbenchmark.net/data/?_=${Date.now()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.videocardbenchmark.net/GPU_mega_page.html',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieHeader
      }
    });

    if (!dataRes.ok) {
      console.warn(`[SCRAPER] HTTP ${dataRes.status} from GPU /data/ endpoint`);
      return [];
    }

    const json = await dataRes.json();
    const rawGpus = json.data || [];
    console.log(`✅ ${rawGpus.length} cartes graphiques brutes reçues de la Mega Page.`);

    const results: BenchmarkItem[] = [];
    const seenNames = new Set<string>();

    for (const item of rawGpus) {
      const gpuName = (item.name || '').trim();
      if (!gpuName) continue;

      let score = 0;
      if (item.g3d && item.g3d !== 'NA') {
        score = parseInt(item.g3d.replace(/[^0-9]/g, ''), 10);
      }
      if (!score || isNaN(score) || score <= 0) {
        if (item.g2d && item.g2d !== 'NA') {
          score = parseInt(item.g2d.replace(/[^0-9]/g, ''), 10);
        }
      }

      if (score > 0 && !seenNames.has(gpuName)) {
        seenNames.add(gpuName);
        results.push({ name: gpuName, score });
      }
    }

    return results;
  } catch (error) {
    console.warn('[SCRAPER] Error fetching GPU Mega Page:', error);
    return [];
  }
}

/**
 * Récupère l'intégralité des processeurs depuis la CPU Mega Page de PassMark
 * (https://www.cpubenchmark.net/CPU_mega_page.html) avec toutes les entrées (ALL)
 */
async function scrapePassmarkCpuMegaPage(): Promise<BenchmarkItem[]> {
  try {
    console.log('📡 Initialisation de session sur PassMark CPU Mega Page...');
    const pageRes = await fetch('https://www.cpubenchmark.net/CPU_mega_page.html', {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!pageRes.ok) {
      console.warn(`[SCRAPER] HTTP ${pageRes.status} from CPU_mega_page.html`);
      return [];
    }

    const cookies = pageRes.headers.getSetCookie
      ? pageRes.headers.getSetCookie()
      : [pageRes.headers.get('set-cookie') || ''];
    const cookieHeader = cookies
      .map((c) => c.split(';')[0])
      .filter(Boolean)
      .join('; ');

    console.log('📡 Téléchargement du jeu de données CPU complet (ALL entries)...');
    const dataRes = await fetch(`https://www.cpubenchmark.net/data/?_=${Date.now()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: 'https://www.cpubenchmark.net/CPU_mega_page.html',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieHeader
      }
    });

    if (!dataRes.ok) {
      console.warn(`[SCRAPER] HTTP ${dataRes.status} from CPU /data/ endpoint`);
      return [];
    }

    const json = await dataRes.json();
    const rawCpus = json.data || [];
    console.log(`✅ ${rawCpus.length} processeurs bruts reçus de la Mega Page.`);

    const results: BenchmarkItem[] = [];
    const seenNames = new Set<string>();

    for (const item of rawCpus) {
      let cpuName = (item.name || '').trim();
      if (!cpuName) continue;

      if (item.cpuCount && item.cpuCount > 1) {
        if (item.cpuCount === 2) cpuName = `[Dual CPU] ${cpuName}`;
        else if (item.cpuCount === 4) cpuName = `[Quad CPU] ${cpuName}`;
        else cpuName = `[${item.cpuCount}-Way CPU] ${cpuName}`;
      }

      // Extraction du score Single-Thread / Gaming CPU Mark en priorité, sinon overall cpumark
      let score = 0;
      if (item.thread && item.thread !== 'NA') {
        score = parseInt(item.thread.replace(/[^0-9]/g, ''), 10);
      }
      if (!score || isNaN(score) || score <= 0) {
        if (item.cpumark && item.cpumark !== 'NA') {
          score = parseInt(item.cpumark.replace(/[^0-9]/g, ''), 10);
        }
      }

      if (score > 0 && !seenNames.has(cpuName)) {
        seenNames.add(cpuName);
        results.push({ name: cpuName, score });
      }
    }

    return results;
  } catch (error) {
    console.warn('[SCRAPER] Error fetching CPU Mega Page:', error);
    return [];
  }
}

async function seedHardware() {
  console.log('🚀 Démarrage du seed hardware LANSmith...');

  // 1. Scraping GPU via GPU Mega Page (ALL Entries)
  console.log('📡 Extraction des benchmarks GPU (PassMark GPU Mega Page - ALL entries)...');
  let gpuList = await scrapePassmarkGpuMegaPage();
  if (gpuList.length === 0) {
    console.log('⚠️ Scraping GPU Mega Page indisponible, chargement du fallback local...');
    gpuList = FALLBACK_GPUS;
  } else {
    console.log(`✅ ${gpuList.length} GPUs extraits de la Mega Page.`);
    for (const fb of FALLBACK_GPUS) {
      if (!gpuList.some((g) => normalizeKey(g.name) === normalizeKey(fb.name))) {
        gpuList.push(fb);
      }
    }
  }

  // 2. Scraping CPU via CPU Mega Page (ALL Entries)
  console.log('📡 Extraction des benchmarks CPU (PassMark CPU Mega Page - ALL entries)...');
  let cpuList = await scrapePassmarkCpuMegaPage();
  if (cpuList.length === 0) {
    console.log('⚠️ Scraping CPU Mega Page indisponible, chargement du fallback local...');
    cpuList = FALLBACK_CPUS;
  } else {
    console.log(`✅ ${cpuList.length} CPUs extraits de la Mega Page.`);
    for (const fb of FALLBACK_CPUS) {
      if (!cpuList.some((c) => normalizeKey(c.name) === normalizeKey(fb.name))) {
        cpuList.push(fb);
      }
    }
  }

  // 3. Insertion / Upsert GPU
  console.log(`💾 Insertion de ${gpuList.length} GPUs dans la base SQLite...`);
  const GPU_CHUNK = 250;
  let gpuCount = 0;
  for (let i = 0; i < gpuList.length; i += GPU_CHUNK) {
    const chunk = gpuList.slice(i, i + GPU_CHUNK);
    await prisma.$transaction(
      chunk.map((gpu) => {
        const normalized = normalizeKey(gpu.name);
        const tier = calculateGpuTier(gpu.score);
        return prisma.benchmarkGpu.upsert({
          where: { normalized },
          update: { name: gpu.name, score: gpu.score, tier },
          create: { name: gpu.name, normalized, score: gpu.score, tier }
        });
      })
    );
    gpuCount += chunk.length;
  }
  console.log(`✅ ${gpuCount} GPUs insérés/mis à jour avec succès.`);

  // 4. Insertion / Upsert CPU (Transaction par chunk de 250 pour SQLite ultra rapide)
  console.log(`💾 Insertion de ${cpuList.length} CPUs dans la base SQLite...`);
  let cpuCount = 0;
  const CPU_CHUNK = 250;

  for (let i = 0; i < cpuList.length; i += CPU_CHUNK) {
    const chunk = cpuList.slice(i, i + CPU_CHUNK);
    await prisma.$transaction(
      chunk.map((cpu) => {
        const normalized = normalizeKey(cpu.name);
        const tier = calculateCpuTier(cpu.score);
        return prisma.benchmarkCpu.upsert({
          where: { normalized },
          update: { name: cpu.name, score: cpu.score, tier },
          create: { name: cpu.name, normalized, score: cpu.score, tier }
        });
      })
    );
    cpuCount += chunk.length;
  }
  console.log(`✅ ${cpuCount} CPUs insérés/mis à jour avec succès.`);

  console.log('🎉 Seed hardware complet terminé !');
}

seedHardware()
  .catch((e) => {
    console.error('❌ Erreur lors du seed hardware:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
