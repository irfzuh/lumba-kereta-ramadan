import React from 'react';
import { BookOpen, Play } from 'lucide-react';
import { RAMADAN_NOTES } from '../data/questions';

interface NotesViewProps {
  onStartRace: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onStartRace }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
        <div className="flex items-start gap-3.5">
          <BookOpen className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Nota Ringkas Ibadah Puasa
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Ulang kaji pantas syarat wajib, syarat sah, rukun, dan hukum puasa sebelum berlumba.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartRace}
          className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Play className="w-4 h-4 fill-current" aria-hidden="true" />
          <span>Uji Ilmu di Litar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RAMADAN_NOTES.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 space-y-4"
          >
            <div>
              <h2 className="font-display text-lg font-bold text-amber-300">
                {section.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">{section.subtitle}</p>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800">
              {section.items.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="text-sm font-semibold text-white">{item.label}</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
