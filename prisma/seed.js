const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function normalizeKey(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(nvidia|geforce|amd|radeon|intel|processor|graphics|core|series)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function main() {
  console.log('🌱 Début du seed LANSmith...');

  // Nettoyage préalable
  await prisma.roundScore.deleteMany();
  await prisma.tournamentRound.deleteMany();
  await prisma.tournamentScore.deleteMany();
  await prisma.tournamentGame.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.rig.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.game.deleteMany();

  // 1. Création des jeux phares de LAN avec scores hardware requis
  const gamesData = [
    {
      igdbId: 19441,
      name: 'TrackMania Nations Forever',
      slug: 'trackmania-nations-forever',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co204m.jpg',
      genres: 'Racing, Arcade',
      summary: 'Le roi des tournois LAN par excellence.',
      minCpuScore: 1200,
      recCpuScore: 2500,
      minGpuScore: 800,
      recGpuScore: 2000,
      minRamGb: 2,
      recRamGb: 4,
      minVramGb: 1,
      recVramGb: 2
    },
    {
      igdbId: 247854,
      name: 'Counter-Strike 2',
      slug: 'counter-strike-2',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7d6a.jpg',
      genres: 'Shooter, Tactical, FPS',
      summary: 'FPS compétitif 5v5 sous Source 2.',
      minCpuScore: 3000,
      recCpuScore: 4200,
      minGpuScore: 8000,
      recGpuScore: 18000,
      minRamGb: 8,
      recRamGb: 16,
      minVramGb: 4,
      recVramGb: 8
    },
    {
      igdbId: 11198,
      name: 'Rocket League',
      slug: 'rocket-league',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vmg.jpg',
      genres: 'Sport, Arcade, Vehicular',
      summary: 'Football avec des voitures fusées.',
      minCpuScore: 2000,
      recCpuScore: 3200,
      minGpuScore: 3500,
      recGpuScore: 8000,
      minRamGb: 4,
      recRamGb: 8,
      minVramGb: 2,
      recVramGb: 4
    },
    {
      igdbId: 2933,
      name: 'FlatOut 2',
      slug: 'flatout-2',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2k9c.jpg',
      genres: 'Racing, Demolition Derby',
      summary: 'Destruction et cascades chaotiques.',
      minCpuScore: 1000,
      recCpuScore: 2000,
      minGpuScore: 600,
      recGpuScore: 1500,
      minRamGb: 2,
      recRamGb: 4,
      minVramGb: 1,
      recVramGb: 2
    },
    {
      igdbId: 233,
      name: 'Left 4 Dead 2',
      slug: 'left-4-dead-2',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg',
      genres: 'Co-op, FPS, Survival Horror',
      summary: 'Survie coopérative contre hordes de zombies.',
      minCpuScore: 1800,
      recCpuScore: 2800,
      minGpuScore: 2000,
      recGpuScore: 5000,
      minRamGb: 4,
      recRamGb: 8,
      minVramGb: 1,
      recVramGb: 3
    },
    {
      igdbId: 1047,
      name: 'Blur',
      slug: 'blur',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3q.jpg',
      genres: 'Racing, Action Arcade',
      summary: 'Courses nerveuses à 20 joueurs avec power-ups.',
      minCpuScore: 2200,
      recCpuScore: 3200,
      minGpuScore: 3000,
      recGpuScore: 7000,
      minRamGb: 4,
      recRamGb: 8,
      minVramGb: 2,
      recVramGb: 4
    }
  ];

  const games = [];
  for (const g of gamesData) {
    const created = await prisma.game.create({ data: g });
    games.push(created);
  }
  console.log(`✅ ${games.length} jeux insérés.`);

  // 2. Création des Participants avec configurations matérielles réalistes
  const participantsData = [
    {
      nickname: 'Apex',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
      rig: {
        cpuName: 'AMD Ryzen 7 7800X3D',
        cpuNormalized: normalizeKey('AMD Ryzen 7 7800X3D'),
        cpuScore: 4800,
        gpuName: 'NVIDIA GeForce RTX 4080 Super',
        gpuNormalized: normalizeKey('NVIDIA GeForce RTX 4080 Super'),
        gpuScore: 34500,
        vramGb: 16,
        ramGb: 32,
        os: 'Windows 11'
      }
    },
    {
      nickname: 'CyberValkyrie',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sarah',
      rig: {
        cpuName: 'Intel Core i5-13600K',
        cpuNormalized: normalizeKey('Intel Core i5-13600K'),
        cpuScore: 4100,
        gpuName: 'NVIDIA GeForce RTX 4070',
        gpuNormalized: normalizeKey('NVIDIA GeForce RTX 4070'),
        gpuScore: 26800,
        vramGb: 12,
        ramGb: 32,
        os: 'Windows 11'
      }
    },
    {
      nickname: 'PixelHunter',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Thomas',
      rig: {
        cpuName: 'AMD Ryzen 5 5600X',
        cpuNormalized: normalizeKey('AMD Ryzen 5 5600X'),
        cpuScore: 3300,
        gpuName: 'NVIDIA GeForce RTX 3060',
        gpuNormalized: normalizeKey('NVIDIA GeForce RTX 3060'),
        gpuScore: 17100,
        vramGb: 12,
        ramGb: 16,
        os: 'Windows 10'
      }
    },
    {
      nickname: 'FragMaster',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lucas',
      rig: {
        cpuName: 'Intel Core i5-10400F',
        cpuNormalized: normalizeKey('Intel Core i5-10400F'),
        cpuScore: 2500,
        gpuName: 'NVIDIA GeForce GTX 1660 Super',
        gpuNormalized: normalizeKey('NVIDIA GeForce GTX 1660 Super'),
        gpuScore: 12800,
        vramGb: 6,
        ramGb: 16,
        os: 'Windows 10'
      }
    },
    {
      nickname: 'NoScope',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Melanie',
      rig: {
        cpuName: 'AMD Ryzen 5 3600',
        cpuNormalized: normalizeKey('AMD Ryzen 5 3600'),
        cpuScore: 2600,
        gpuName: 'AMD Radeon RX 580',
        gpuNormalized: normalizeKey('AMD Radeon RX 580'),
        gpuScore: 8800,
        vramGb: 8,
        ramGb: 16,
        os: 'Windows 11'
      }
    },
    {
      nickname: 'RetroNerd',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Julien',
      rig: {
        cpuName: 'Intel Core i5-7400',
        cpuNormalized: normalizeKey('Intel Core i5-7400'),
        cpuScore: 1800,
        gpuName: 'NVIDIA GeForce GTX 1050 Ti',
        gpuNormalized: normalizeKey('NVIDIA GeForce GTX 1050 Ti'),
        gpuScore: 6300,
        vramGb: 4,
        ramGb: 8,
        os: 'Windows 10'
      }
    },
    {
      nickname: 'LaptopWarrior',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Camille',
      rig: {
        cpuName: 'AMD Ryzen 5 5500U',
        cpuNormalized: normalizeKey('AMD Ryzen 5 5500U'),
        cpuScore: 2400,
        gpuName: 'AMD Radeon Vega 7',
        gpuNormalized: normalizeKey('AMD Radeon Vega 7'),
        gpuScore: 2600,
        vramGb: 2,
        ramGb: 8,
        os: 'Windows 11'
      }
    }
  ];

  const participants = [];
  for (const p of participantsData) {
    const { rig, ...partData } = p;
    const createdPart = await prisma.participant.create({
      data: {
        ...partData,
        rig: {
          create: rig
        }
      },
      include: { rig: true }
    });
    participants.push(createdPart);
  }
  console.log(`✅ ${participants.length} participants et configurations enregistrés.`);

  // 3. Création du tournoi inaugural "LANSmith Championship 2026"
  const tournament = await prisma.tournament.create({
    data: {
      name: 'LANSmith Championship 2026',
      status: 'IN_PROGRESS',
      scoringRules: JSON.stringify([10, 8, 6, 5, 4, 3, 2, 1]),
      tournamentGames: {
        create: [
          { gameId: games[0].id, order: 1, scoringType: 'SCOREBOARD' }, // TrackMania
          { gameId: games[2].id, order: 2, scoringType: 'SCOREBOARD' }, // Rocket League
          { gameId: games[3].id, order: 3, scoringType: 'SCOREBOARD' }, // FlatOut 2
          { gameId: games[1].id, order: 4, scoringType: 'WIN_LOSE' }    // Counter-Strike 2
        ]
      }
    },
    include: { tournamentGames: true }
  });

  // 4. Initialisation des manches et scores réels
  const tmGame = tournament.tournamentGames.find((tg) => tg.gameId === games[0].id);
  if (tmGame) {
    const round1 = await prisma.tournamentRound.create({
      data: {
        tournamentGameId: tmGame.id,
        roundNumber: 1,
        name: 'Qualification Track A01'
      }
    });

    const tmScores = [
      { participantIdx: 0, rank: 1, rawScore: 54.21, points: 10 },
      { participantIdx: 2, rank: 2, rawScore: 55.08, points: 8 },
      { participantIdx: 1, rank: 3, rawScore: 55.89, points: 6 },
      { participantIdx: 4, rank: 4, rawScore: 57.34, points: 5 },
      { participantIdx: 3, rank: 5, rawScore: 58.12, points: 4 },
      { participantIdx: 6, rank: 6, rawScore: 61.4, points: 3 },
      { participantIdx: 5, rank: 7, rawScore: 63.85, points: 2 }
    ];

    for (const r of tmScores) {
      await prisma.roundScore.create({
        data: {
          roundId: round1.id,
          participantId: participants[r.participantIdx].id,
          rank: r.rank,
          rawScore: r.rawScore,
          points: r.points
        }
      });
      await prisma.tournamentScore.create({
        data: {
          tournamentId: tournament.id,
          participantId: participants[r.participantIdx].id,
          gameId: games[0].id,
          rank: r.rank,
          rawScore: r.rawScore,
          points: Math.round(r.points)
        }
      });
    }
  }

  console.log('🏆 Tournoi initialisé avec scores et manches !');
  console.log('🎉 Seed terminé avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
