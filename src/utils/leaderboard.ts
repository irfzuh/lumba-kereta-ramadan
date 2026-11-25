import { Difficulty, LeaderboardEntry, RaceOutcome } from '../types/game';

const STORAGE_KEY = 'lumba_kereta_ramadan_leaderboard_v1';

const SEEDED_ENTRIES: LeaderboardEntry[] = [
  {
    id: 'seed-1',
    playerName: 'Aiman Hakim',
    vehicle: 'car',
    difficulty: 'hard',
    score: 1840,
    accuracy: 92,
    timeRemaining: 24.5,
    won: true,
    createdAt: '2026-03-14T16:10:00.000Z',
  },
  {
    id: 'seed-2',
    playerName: 'Nurul Izzah',
    vehicle: 'camel',
    difficulty: 'medium',
    score: 1620,
    accuracy: 88,
    timeRemaining: 19.2,
    won: true,
    createdAt: '2026-03-14T15:40:00.000Z',
  },
  {
    id: 'seed-3',
    playerName: 'Danish Irfan',
    vehicle: 'car',
    difficulty: 'medium',
    score: 1490,
    accuracy: 83,
    timeRemaining: 15.8,
    won: true,
    createdAt: '2026-03-14T14:25:00.000Z',
  },
  {
    id: 'seed-4',
    playerName: 'Siti Aisyah',
    vehicle: 'camel',
    difficulty: 'easy',
    score: 1350,
    accuracy: 90,
    timeRemaining: 14.0,
    won: true,
    createdAt: '2026-03-13T17:05:00.000Z',
  },
  {
    id: 'seed-5',
    playerName: 'Muhammad Faiz',
    vehicle: 'car',
    difficulty: 'easy',
    score: 1180,
    accuracy: 78,
    timeRemaining: 10.4,
    won: true,
    createdAt: '2026-03-13T11:30:00.000Z',
  },
];

export function calculateRaceScore(params: {
  winner: 'player' | 'ai' | 'sunset';
  playerDistance: number;
  timeRemaining: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  difficulty: Difficulty;
}): number {
  const { winner, playerDistance, timeRemaining, correctCount, wrongCount, bestStreak, difficulty } = params;
  const totalAnswered = correctCount + wrongCount;
  const accuracyBonus = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 250) : 0;
  const distancePoints = Math.round(playerDistance * 0.5);
  const answerPoints = correctCount * 85 - wrongCount * 15;
  const streakPoints = bestStreak * 30;
  const winBonus = winner === 'player' ? 450 : 0;
  const timeBonus = winner === 'player' ? Math.round(timeRemaining * 16) : 0;
  const diffMultiplier = difficulty === 'hard' ? 1.2 : difficulty === 'medium' ? 1.1 : 1.0;

  return Math.max(0, Math.round((distancePoints + answerPoints + accuracyBonus + streakPoints + winBonus + timeBonus) * diffMultiplier));
}

export function loadLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEEDED_ENTRIES));
      return [...SEEDED_ENTRIES].sort((a, b) => b.score - a.score);
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...SEEDED_ENTRIES].sort((a, b) => b.score - a.score);
    }
    return parsed.sort((a, b) => b.score - a.score || b.timeRemaining - a.timeRemaining);
  } catch {
    return [...SEEDED_ENTRIES].sort((a, b) => b.score - a.score);
  }
}

export function saveRaceToLeaderboard(outcome: RaceOutcome): { entries: LeaderboardEntry[]; newEntryId: string } {
  const current = loadLeaderboard();
  const totalAnswered = outcome.correctCount + outcome.wrongCount;
  const accuracy = totalAnswered > 0 ? Math.round((outcome.correctCount / totalAnswered) * 100) : 0;
  const newEntryId = `run-${Date.now()}`;

  const entry: LeaderboardEntry = {
    id: newEntryId,
    playerName: outcome.playerName.trim() || 'Pelumba Tetamu',
    vehicle: outcome.vehicle,
    carName: outcome.carName,
    difficulty: outcome.difficulty,
    score: outcome.score,
    accuracy,
    timeRemaining: Number(outcome.timeRemaining.toFixed(1)),
    won: outcome.winner === 'player',
    createdAt: new Date().toISOString(),
    isUserRecord: true,
  };

  const updated = [entry, ...current]
    .sort((a, b) => b.score - a.score || b.timeRemaining - a.timeRemaining)
    .slice(0, 25);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota issues
  }

  return { entries: updated, newEntryId };
}

export function resetLeaderboard(): LeaderboardEntry[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEEDED_ENTRIES));
  } catch {
    // Ignore storage errors
  }
  return [...SEEDED_ENTRIES].sort((a, b) => b.score - a.score);
}
