import React, { useState } from 'react';
import { Trophy, RotateCcw } from 'lucide-react';
import { LeaderboardEntry, VehicleType } from '../types/game';
import { playUiClick } from '../utils/sound';

interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  highlightId: string | null;
  muted?: boolean;
  onReset: () => void;
  onStartRace: () => void;
}

const TROPHY_IMAGE_PATH = '/src/assets/images/ramadan_trophy_crescent_1795543663228.jpg';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  highlightId,
  muted = false,
  onReset,
  onStartRace,
}) => {
  const [filter, setFilter] = useState<'all' | VehicleType>('all');
  const [imgFailed, setImgFailed] = useState(false);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.vehicle === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950 shrink-0 flex items-center justify-center">
            {!imgFailed ? (
              <img
                src={TROPHY_IMAGE_PATH}
                alt="Piala Papan Pendahulu Ramadan"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Trophy className="w-8 h-8 text-amber-400" aria-hidden="true" />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Papan Pendahulu Pelumba
            </h1>
            <p className="text-sm text-slate-300 mt-0.5">
              Senarai murid terpantas dan paling tepat menjawab kuiz ibadah puasa Ramadan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'car', label: 'Kereta' },
                { id: 'camel', label: 'Unta' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playUiClick(muted);
                  setFilter(tab.id);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Set Semula</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-medium text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-4 w-16">Ked.</th>
                <th className="py-3.5 px-4">Nama Murid</th>
                <th className="py-3.5 px-4">Kenderaan</th>
                <th className="py-3.5 px-4">Tahap</th>
                <th className="py-3.5 px-4 text-right">Ketepatan</th>
                <th className="py-3.5 px-4 text-right">Baki Masa</th>
                <th className="py-3.5 px-4 text-right">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Tiada rekod ditemui untuk kategori ini.{' '}
                    <button
                      type="button"
                      onClick={onStartRace}
                      className="text-amber-400 hover:underline font-medium cursor-pointer"
                    >
                      Mulakan perlumbaan pertama
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((entry, idx) => {
                  const isHighlighted = entry.id === highlightId;
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isHighlighted
                          ? 'bg-amber-500/12 text-white'
                          : 'hover:bg-slate-800/40 text-slate-200'
                      }
                    >
                      <td className="py-3.5 px-4 font-mono-num font-bold text-amber-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {entry.playerName}
                        {entry.isUserRecord && (
                          <span className="ml-2 text-xs text-emerald-400 font-normal">
                            · Rekod Anda
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {entry.vehicle === 'car' ? entry.carName || 'Kereta Sport' : 'Unta Gurun'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {entry.difficulty === 'easy'
                          ? 'Santai'
                          : entry.difficulty === 'medium'
                          ? 'Sederhana'
                          : 'Pantas'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num">
                        {entry.accuracy}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num text-slate-300">
                        {entry.timeRemaining.toFixed(1)}s
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono-num font-bold text-amber-300">
                        {entry.score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
