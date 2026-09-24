import * as cheerio from 'cheerio';
import { prisma } from './prisma';

export interface ParsedRequirement {
  cpu?: string;
  gpu?: string;
  ramGb?: number;
  vramGb?: number;
  os?: string;
  storage?: string;
  directx?: string;
  rawHtml?: string;
  rawText?: string;
  matchedCpu?: { name: string; score: number };
  matchedGpu?: { name: string; score: number };
}

export interface SteamGameEnrichment {
  steamAppId: string;
  steamUrl: string;
  minimum?: ParsedRequirement;
  recommended?: ParsedRequirement;
}

export function extractSteamAppId(externalGames?: any[]): { appId: string; url: string } | null {
  if (!externalGames || !Array.isArray(externalGames)) return null;

  // 1. Check for category === 1 (Steam)
  const steamEntry = externalGames.find(
    (eg) => eg.category === 1 || (eg.url && eg.url.includes('store.steampowered.com'))
  );

  if (!steamEntry) return null;

  let appId = '';
  if (steamEntry.uid && /^\d+$/.test(steamEntry.uid)) {
    appId = steamEntry.uid;
  } else if (steamEntry.url) {
    const match = steamEntry.url.match(/\/app\/(\d+)/);
    if (match) appId = match[1];
  }

  if (!appId) return null;

  return {
    appId,
    url: steamEntry.url || `https://store.steampowered.com/app/${appId}`
  };
}

export function parseSteamHtml(html?: string): ParsedRequirement | undefined {
  if (!html || typeof html !== 'string') return undefined;

  const $ = cheerio.load(html);
  let cpu = '';
  let gpu = '';
  let ramGb = 0;
  let vramGb = 0;
  let os = '';
  let storage = '';
  let directx = '';

  $('li').each((_, el) => {
    const fullLine = $(el).text().trim();
    const strongEl = $(el).find('strong');
    const strongText = strongEl.text().trim().toLowerCase();
    const cleanContent = fullLine
      .replace(strongEl.text(), '')
      .replace(/^[\s:：]+/, '')
      .trim();

    if (strongText.includes('proc') || strongText.includes('cpu')) {
      cpu = cleanContent;
    } else if (
      strongText.includes('graph') ||
      strongText.includes('vid') ||
      strongText.includes('gpu') ||
      strongText.includes('carte')
    ) {
      gpu = cleanContent;
    } else if (
      strongText.includes('mém') ||
      strongText.includes('mem') ||
      strongText.includes('ram')
    ) {
      const match = cleanContent.match(/(\d+)\s*(?:go|gb|mo|mb)/i);
      if (match) {
        let val = parseInt(match[1], 10);
        if (/mo|mb/i.test(match[0])) val = Math.ceil(val / 1024);
        ramGb = val;
      }
    } else if (strongText.includes('syst') || strongText.includes('os')) {
      os = cleanContent;
    } else if (
      strongText.includes('esp') ||
      strongText.includes('stock') ||
      strongText.includes('disq') ||
      strongText.includes('storage')
    ) {
      storage = cleanContent;
    } else if (strongText.includes('directx')) {
      directx = cleanContent;
    }
  });

  // Extract VRAM from GPU description if mentioned (e.g., '6GB' or '8 Go')
  if (gpu) {
    const vramMatch = gpu.match(/(\d+)\s*(?:go|gb)\s*(?:de vram|vram|de mémoire)?/i);
    if (vramMatch) {
      vramGb = parseInt(vramMatch[1], 10);
    }
  }

  return {
    cpu: cpu || undefined,
    gpu: gpu || undefined,
    ramGb: ramGb || undefined,
    vramGb: vramGb || undefined,
    os: os || undefined,
    storage: storage || undefined,
    directx: directx || undefined,
    rawHtml: html,
    rawText: $.text().replace(/\s+/g, ' ').trim()
  };
}

function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(nvidia|geforce|amd|radeon|intel|processor|graphics|core|series|edition|super|ti|xt|xtx|dual|quad)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export async function matchHardware(text?: string, type: 'cpu' | 'gpu' = 'cpu'): Promise<{ name: string; score: number } | undefined> {
  if (!text) return undefined;
  const parts = text.split(/\s+or\s+|\s*\/\s*|\s*,\s*|\s+ou\s+/i).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const norm = normalizeKey(part);
    if (!norm) continue;

    if (type === 'cpu') {
      const match = await prisma.benchmarkCpu.findFirst({
        where: {
          OR: [
            { normalized: { contains: norm } },
            { name: { contains: part } }
          ]
        },
        orderBy: { score: 'desc' }
      });
      if (match) return { name: match.name, score: match.score };
    } else {
      const match = await prisma.benchmarkGpu.findFirst({
        where: {
          OR: [
            { normalized: { contains: norm } },
            { name: { contains: part } }
          ]
        },
        orderBy: { score: 'desc' }
      });
      if (match) return { name: match.name, score: match.score };
    }
  }
  return undefined;
}

export async function fetchSteamRequirements(appId: string): Promise<{ minimum?: ParsedRequirement; recommended?: ParsedRequirement } | null> {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=fr&l=french`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    if (!res.ok) return null;
    const json = await res.json();
    const appData = json[appId]?.data;
    if (!appData || !appData.pc_requirements) return null;

    const pcReqs = appData.pc_requirements;
    const minParsed = parseSteamHtml(pcReqs.minimum);
    const recParsed = parseSteamHtml(pcReqs.recommended);

    if (minParsed) {
      if (minParsed.cpu) minParsed.matchedCpu = await matchHardware(minParsed.cpu, 'cpu');
      if (minParsed.gpu) minParsed.matchedGpu = await matchHardware(minParsed.gpu, 'gpu');
    }

    if (recParsed) {
      if (recParsed.cpu) recParsed.matchedCpu = await matchHardware(recParsed.cpu, 'cpu');
      if (recParsed.gpu) recParsed.matchedGpu = await matchHardware(recParsed.gpu, 'gpu');
    }

    return {
      minimum: minParsed,
      recommended: recParsed
    };
  } catch (err) {
    console.warn(`[Steam API Error for ${appId}]`, err);
    return null;
  }
}
