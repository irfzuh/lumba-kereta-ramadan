import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX, Music, Sun, Gauge, Flag } from 'lucide-react';
import { QUIZ_QUESTIONS } from './data/questions';
import { CAR_OPTIONS } from './data/vehicles';
import {
  Difficulty,
  GameState,
  LeaderboardEntry,
  NavView,
  PlayerBoostStatus,
  QuizQuestion,
  RaceOutcome,
  VehicleType,
} from './types/game';
import {
  calculateRaceScore,
  loadLeaderboard,
  resetLeaderboard,
  saveRaceToLeaderboard,
} from './utils/leaderboard';
import {
  playCorrectNitro,
  playDefeat,
  playStartRace,
  playUiClick,
  playUiSelect,
  playUiToggle,
  playVictory,
  playWrongBrake,
  stopRaceAudio,
  updateRaceAudio,
} from './utils/sound';
import { RaceCanvas } from './components/RaceCanvas';
import { QuizPanel } from './components/QuizPanel';
import { TitleMenu } from './components/TitleMenu';
import { RoundSummary } from './components/RoundSummary';
import { LeaderboardView } from './components/LeaderboardView';
import { NotesView } from './components/NotesView';

const FINISH_DISTANCE = 1000;
const BASE_PLAYER_SPEED = 44;
const NITRO_BASE_SPEED = 125;
const NITRO_DURATION = 2.6;
const STOP_DURATION = 2.0;
const SPEED_TO_MPS = 0.34;

const DIFFICULTY_CONFIG: Record<Difficulty, { aiSpeed: number; totalTime: number }> = {
  easy: { aiSpeed: 52, totalTime: 70 },
  medium: { aiSpeed: 62, totalTime: 60 },
  hard: { aiSpeed: 72, totalTime: 55 },
};

function shuffleQuestions(list: QuizQuestion[]): QuizQuestion[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function App() {
  const [navView, setNavView] = useState<NavView>('arena');
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [playerName, setPlayerName] = useState<string>('Murid 1');
  const [vehicle, setVehicle] = useState<VehicleType>('car');
  const [selectedCarId, setSelectedCarId] = useState<string>(CAR_OPTIONS[0].id);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [muted, setMuted] = useState<boolean>(false);
  const [musicMuted, setMusicMuted] = useState<boolean>(false);

  const selectedCar = useMemo(
    () => CAR_OPTIONS.find((c) => c.id === selectedCarId) ?? CAR_OPTIONS[0],
    [selectedCarId]
  );

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RaceOutcome | null>(null);

  const [deck, setDeck] = useState<QuizQuestion[]>(() => shuffleQuestions(QUIZ_QUESTIONS));
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const [playerDistance, setPlayerDistance] = useState<number>(0);
  const [aiDistance, setAiDistance] = useState<number>(0);
  const [playerSpeed, setPlayerSpeed] = useState<number>(BASE_PLAYER_SPEED);
  const [bgOffset, setBgOffset] = useState<number>(0);
  const [boostStatus, setBoostStatus] = useState<PlayerBoostStatus>('normal');
  const [timeRemaining, setTimeRemaining] = useState<number>(DIFFICULTY_CONFIG.medium.totalTime);
  const [streak, setStreak] = useState<number>(0);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const musicMutedRef = useRef(musicMuted);
  musicMutedRef.current = musicMuted;

  const simRef = useRef({
    active: false,
    playerDist: 0,
    aiDist: 0,
    speed: BASE_PLAYER_SPEED,
    aiSpeed: DIFFICULTY_CONFIG.medium.aiSpeed,
    bgOffset: 0,
    status: 'normal' as PlayerBoostStatus,
    statusTimer: 0,
    timeRemaining: DIFFICULTY_CONFIG.medium.totalTime,
    totalTime: DIFFICULTY_CONFIG.medium.totalTime,
    correctCount: 0,
    wrongCount: 0,
    streak: 0,
    bestStreak: 0,
    topSpeed: BASE_PLAYER_SPEED,
    playerName: 'Murid 1',
    vehicle: 'car' as VehicleType,
    carId: CAR_OPTIONS[0].id,
    carName: CAR_OPTIONS[0].name,
    difficulty: 'medium' as Difficulty,
  });

  const advanceTimerRef = useRef<number | null>(null);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const handleSelectCar = useCallback((carId: string) => {
    playUiSelect(mutedRef.current);
    setSelectedCarId(carId);
    setVehicle('car');
  }, []);

  const handleSelectCamel = useCallback(() => {
    playUiSelect(mutedRef.current);
    setVehicle('camel');
  }, []);

  const handleSelectDifficulty = useCallback((nextDiff: Difficulty) => {
    playUiSelect(mutedRef.current);
    setDifficulty(nextDiff);
  }, []);

  const finishRace = useCallback((winner: 'player' | 'ai' | 'sunset') => {
    const s = simRef.current;
    if (!s.active) return;
    s.active = false;
    clearAdvanceTimer();
    stopRaceAudio();

    const score = calculateRaceScore({
      winner,
      playerDistance: s.playerDist,
      timeRemaining: s.timeRemaining,
      correctCount: s.correctCount,
      wrongCount: s.wrongCount,
      bestStreak: s.bestStreak,
      difficulty: s.difficulty,
    });

    const outcome: RaceOutcome = {
      winner,
      playerDistance: Math.min(FINISH_DISTANCE, s.playerDist),
      aiDistance: Math.min(FINISH_DISTANCE, s.aiDist),
      timeRemaining: Math.max(0, s.timeRemaining),
      totalTime: s.totalTime,
      correctCount: s.correctCount,
      wrongCount: s.wrongCount,
      bestStreak: s.bestStreak,
      topSpeed: s.topSpeed,
      score,
      vehicle: s.vehicle,
      carId: s.vehicle === 'car' ? s.carId : undefined,
      carName: s.vehicle === 'car' ? s.carName : undefined,
      difficulty: s.difficulty,
      playerName: s.playerName,
    };

    const { entries, newEntryId } = saveRaceToLeaderboard(outcome);
    setLeaderboard(entries);
    setHighlightEntryId(newEntryId);
    setLastOutcome(outcome);
    setGameState('ROUND_SUMMARY');

    if (winner === 'player') {
      playVictory(mutedRef.current);
    } else {
      playDefeat(mutedRef.current);
    }
  }, []);

  const startRace = useCallback(() => {
    clearAdvanceTimer();
    stopRaceAudio();
    const cfg = DIFFICULTY_CONFIG[difficulty];
    const shuffled = shuffleQuestions(QUIZ_QUESTIONS);

    simRef.current = {
      active: true,
      playerDist: 0,
      aiDist: 0,
      speed: BASE_PLAYER_SPEED,
      aiSpeed: cfg.aiSpeed,
      bgOffset: 0,
      status: 'normal',
      statusTimer: 0,
      timeRemaining: cfg.totalTime,
      totalTime: cfg.totalTime,
      correctCount: 0,
      wrongCount: 0,
      streak: 0,
      bestStreak: 0,
      topSpeed: BASE_PLAYER_SPEED,
      playerName: playerName.trim() || 'Pelumba Tetamu',
      vehicle,
      carId: selectedCar.id,
      carName: selectedCar.name,
      difficulty,
    };

    setDeck(shuffled);
    setQuestionIdx(0);
    setSelectedOption(null);
    setPlayerDistance(0);
    setAiDistance(0);
    setPlayerSpeed(BASE_PLAYER_SPEED);
    setBgOffset(0);
    setBoostStatus('normal');
    setTimeRemaining(cfg.totalTime);
    setStreak(0);
    setLastOutcome(null);
    setNavView('arena');
    setGameState('PLAYING');
    playStartRace(mutedRef.current, vehicle, musicMutedRef.current);
  }, [difficulty, playerName, selectedCar.id, selectedCar.name, vehicle]);

  const stopRaceEarly = useCallback(() => {
    playUiClick(mutedRef.current);
    simRef.current.active = false;
    clearAdvanceTimer();
    stopRaceAudio();
    setGameState('TITLE_MENU');
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING') {
      stopRaceAudio();
      return;
    }

    let animId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const s = simRef.current;
      if (!s.active) return;

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (s.status !== 'normal') {
        s.statusTimer -= dt;
        if (s.statusTimer <= 0) {
          s.status = 'normal';
          s.statusTimer = 0;
          s.speed = BASE_PLAYER_SPEED;
        }
      }

      s.playerDist += s.speed * SPEED_TO_MPS * dt;
      s.bgOffset += s.speed * dt * 4.2;
      s.aiDist += s.aiSpeed * SPEED_TO_MPS * dt;
      s.timeRemaining = Math.max(0, s.timeRemaining - dt);

      updateRaceAudio({
        active: s.active,
        muted: mutedRef.current,
        musicMuted: musicMutedRef.current,
        vehicle: s.vehicle,
        speed: s.speed,
        boostStatus: s.status,
        nowMs: now,
      });

      setPlayerDistance(s.playerDist);
      setAiDistance(s.aiDist);
      setPlayerSpeed(s.speed);
      setBgOffset(s.bgOffset);
      setBoostStatus(s.status);
      setTimeRemaining(s.timeRemaining);

      if (s.playerDist >= FINISH_DISTANCE) {
        finishRace('player');
        return;
      }
      if (s.aiDist >= FINISH_DISTANCE) {
        finishRace('ai');
        return;
      }
      if (s.timeRemaining <= 0) {
        finishRace('sunset');
        return;
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(animId);
      stopRaceAudio();
    };
  }, [finishRace, gameState]);

  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      stopRaceAudio();
    };
  }, []);

  const handleAnswer = useCallback(
    (optionIndex: number) => {
      const s = simRef.current;
      if (!s.active || selectedOption !== null) return;

      const currentQ = deck[questionIdx];
      if (!currentQ) return;

      setSelectedOption(optionIndex);
      const isCorrect = optionIndex === currentQ.correctIndex;

      if (isCorrect) {
        s.correctCount += 1;
        s.streak += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        const boostedSpeed = NITRO_BASE_SPEED + Math.min((s.streak - 1) * 6, 24);
        s.speed = boostedSpeed;
        s.topSpeed = Math.max(s.topSpeed, boostedSpeed);
        s.status = 'nitro';
        s.statusTimer = NITRO_DURATION;
        setStreak(s.streak);
        setPlayerSpeed(s.speed);
        setBoostStatus('nitro');
        playCorrectNitro(mutedRef.current, s.vehicle);
      } else {
        s.wrongCount += 1;
        s.streak = 0;
        s.speed = 0;
        s.status = 'stopped';
        s.statusTimer = STOP_DURATION;
        setStreak(0);
        setPlayerSpeed(0);
        setBoostStatus('stopped');
        playWrongBrake(mutedRef.current);
      }

      clearAdvanceTimer();
      advanceTimerRef.current = window.setTimeout(() => {
        if (!simRef.current.active) return;
        setSelectedOption(null);
        setQuestionIdx((prev) => {
          const next = prev + 1;
          if (next >= deck.length) {
            setDeck(shuffleQuestions(QUIZ_QUESTIONS));
            return 0;
          }
          return next;
        });
      }, 1150);
    },
    [deck, questionIdx, selectedOption]
  );

  const handleNavigate = (view: NavView) => {
    playUiClick(mutedRef.current);
    if (gameState === 'PLAYING') {
      stopRaceEarly();
    } else if (view === 'arena' && gameState === 'ROUND_SUMMARY') {
      setGameState('TITLE_MENU');
    }
    setNavView(view);
  };

  const handleResetLeaderboard = () => {
    playUiClick(mutedRef.current);
    setLeaderboard(resetLeaderboard());
    setHighlightEntryId(null);
  };

  const currentRank =
    highlightEntryId !== null
      ? leaderboard.findIndex((e) => e.id === highlightEntryId) + 1 || null
      : null;

  const totalTimeForRace = DIFFICULTY_CONFIG[difficulty].totalTime;
  const playerPct = Math.min(100, (playerDistance / FINISH_DISTANCE) * 100);
  const aiPct = Math.min(100, (aiDistance / FINISH_DISTANCE) * 100);

  const isLockedViewport = navView === 'arena' && (gameState === 'PLAYING' || gameState === 'TITLE_MENU');

  return (
    <div className="h-dvh max-h-screen flex flex-col overflow-hidden bg-[#0F172A] text-[#F8FAFC]">
      {/* Compact 44px 3-Zone Top Bar (Single row across all devices for 500px Jotform fit) */}
      <header className="h-11 shrink-0 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-sm z-30">
        <div className="max-w-[1200px] h-full mx-auto px-3 sm:px-5 flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => handleNavigate('arena')}
            className="font-display text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 cursor-pointer hover:text-amber-300 transition-colors"
          >
            Lumba Kereta Ramadan
          </button>

          <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => handleNavigate('arena')}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 border-b-2 ${
                navView === 'arena'
                  ? 'text-amber-300 border-amber-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Arena
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('leaderboard')}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 border-b-2 ${
                navView === 'leaderboard'
                  ? 'text-amber-300 border-amber-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Pendahulu
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('notes')}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 border-b-2 ${
                navView === 'notes'
                  ? 'text-amber-300 border-amber-400'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Nota
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            {gameState === 'PLAYING' && navView === 'arena' ? (
              <button
                type="button"
                onClick={stopRaceEarly}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Tamat
              </button>
            ) : (
              <button
                type="button"
                onClick={startRace}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Mula Lumba
              </button>
            )}
          </div>
        </div>
      </header>

      <main
        className={`flex-1 min-h-0 max-w-[1200px] w-full mx-auto px-2.5 sm:px-5 py-2 sm:py-3 flex flex-col ${
          isLockedViewport ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        {navView === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboard}
            highlightId={highlightEntryId}
            muted={muted}
            onReset={handleResetLeaderboard}
            onStartRace={startRace}
          />
        )}

        {navView === 'notes' && <NotesView onStartRace={startRace} />}

        {navView === 'arena' && gameState === 'TITLE_MENU' && (
          <TitleMenu
            playerName={playerName}
            onChangeName={setPlayerName}
            vehicle={vehicle}
            selectedCarId={selectedCarId}
            onSelectCar={handleSelectCar}
            onSelectCamel={handleSelectCamel}
            difficulty={difficulty}
            onSelectDifficulty={handleSelectDifficulty}
            onStartRace={startRace}
          />
        )}

        {navView === 'arena' && gameState === 'PLAYING' && (
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            {/* Compact 34px Race HUD Strip */}
            <div className="h-[34px] shrink-0 rounded-lg border border-slate-800 bg-slate-900/90 px-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 sm:gap-5 text-xs overflow-hidden">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Sun
                    className={`w-3.5 h-3.5 shrink-0 ${
                      timeRemaining <= 12 ? 'text-red-400' : 'text-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-mono-num font-bold ${
                      timeRemaining <= 12 ? 'text-red-400' : 'text-white'
                    }`}
                  >
                    {timeRemaining.toFixed(1)}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Gauge className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span className="font-mono-num font-bold text-white">
                    {Math.round(playerSpeed)} km/j
                  </span>
                </div>

                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Flag className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                  <span className="font-mono-num font-bold text-white">
                    {Math.round(playerDistance)}m
                    <span className="text-slate-400 font-normal">/{Math.round(aiDistance)}m</span>
                  </span>
                </div>

                {streak >= 2 && (
                  <span className="hidden sm:inline text-[11px] font-medium text-amber-300 whitespace-nowrap">
                    {streak}x
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden md:flex items-center gap-2 w-36">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-slate-500/70 transition-all duration-150"
                      style={{ width: `${aiPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-150"
                      style={{ width: `${playerPct}%` }}
                    />
                  </div>
                  <span className="font-mono-num text-[11px] text-slate-300 w-8 text-right">
                    {Math.round(playerPct)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !musicMuted;
                    playUiToggle(mutedRef.current, !next);
                    setMusicMuted(next);
                  }}
                  aria-label={musicMuted ? 'Mainkan lagu latar' : 'Hentikan lagu latar'}
                  title={musicMuted ? 'Lagu Latar: Mati' : 'Lagu Latar: Aktif'}
                  className={`p-1 rounded-md border transition-colors cursor-pointer ${
                    !musicMuted && !muted
                      ? 'border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'
                      : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !muted;
                    playUiToggle(next, !next);
                    setMuted(next);
                  }}
                  aria-label={muted ? 'Aktifkan bunyi' : 'Senyapkan bunyi'}
                  title={muted ? 'Bunyi: Senyap' : 'Bunyi: Aktif'}
                  className="p-1 rounded-md border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {deck[questionIdx] && (
              <QuizPanel
                question={deck[questionIdx]}
                questionNumber={questionIdx + 1}
                selectedOption={selectedOption}
                boostStatus={boostStatus}
                onAnswer={handleAnswer}
              />
            )}

            <RaceCanvas
              playerVehicle={vehicle}
              selectedCar={selectedCar}
              playerDistance={playerDistance}
              aiDistance={aiDistance}
              finishDistance={FINISH_DISTANCE}
              playerSpeed={playerSpeed}
              aiSpeed={DIFFICULTY_CONFIG[difficulty].aiSpeed}
              bgOffset={bgOffset}
              boostStatus={boostStatus}
              timeRemaining={timeRemaining}
              totalTime={totalTimeForRace}
            />
          </div>
        )}

        {navView === 'arena' && gameState === 'ROUND_SUMMARY' && lastOutcome && (
          <RoundSummary
            outcome={lastOutcome}
            rankPosition={currentRank}
            onPlayAgain={startRace}
            onViewLeaderboard={() => {
              playUiClick(mutedRef.current);
              setNavView('leaderboard');
            }}
            onGoHome={() => {
              playUiClick(mutedRef.current);
              setNavView('arena');
              setGameState('TITLE_MENU');
            }}
          />
        )}
      </main>
    </div>
  );
}
