export type VehicleType = 'car' | 'camel';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type GameState = 'TITLE_MENU' | 'PLAYING' | 'ROUND_SUMMARY';

export type NavView = 'arena' | 'leaderboard' | 'notes';

export type PlayerBoostStatus = 'normal' | 'nitro' | 'stopped';

export interface CarOption {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  bodyColor: string;
  trimColor: string;
}

export interface QuizQuestion {
  id: string;
  category: 'Hukum Puasa' | 'Syarat & Rukun' | 'Batal Puasa' | 'Sunat & Adab' | 'Keistimewaan Ramadan';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface RaceOutcome {
  winner: 'player' | 'ai' | 'sunset';
  playerDistance: number;
  aiDistance: number;
  timeRemaining: number;
  totalTime: number;
  correctCount: number;
  wrongCount: number;
  bestStreak: number;
  topSpeed: number;
  score: number;
  vehicle: VehicleType;
  carId?: string;
  carName?: string;
  difficulty: Difficulty;
  playerName: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  vehicle: VehicleType;
  carName?: string;
  difficulty: Difficulty;
  score: number;
  accuracy: number;
  timeRemaining: number;
  won: boolean;
  createdAt: string;
  isUserRecord?: boolean;
}
