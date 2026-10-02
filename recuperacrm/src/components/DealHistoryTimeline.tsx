import React, { useState } from 'react';
import {
  DownloadCloud,
  ArrowRightLeft,
  CheckCircle2,
  Trash2,
  UserCheck,
  CheckCheck,
  Archive,
  ArrowUpDown,
  Clock,
  Sparkles
} from 'lucide-react';
import { HistoryEvent, HistoryEventType } from '../types';

interface DealHistoryTimelineProps {
  events: HistoryEvent[];
}

export const DealHistoryTimeline: React.FC<DealHistoryTimelineProps> = ({ events }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedEvents = [...events].sort((a, b) => {
    // In asc order: original progression order from import to latest
    return sortOrder === 'asc' ? 0 : -1;
  });
  if (sortOrder === 'desc') {
    sortedEvents.reverse();
  }

  const getEventIconAndStyle = (type: HistoryEventType, title: string) => {
    switch (type) {
      case 'import':
        return {
          icon: <DownloadCloud className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />,
          dotBg: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
      case 'stage_change':
        return {
          icon: <ArrowRightLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
          dotBg: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
        };
      case 'activity_added':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          dotBg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
        };
      case 'activity_removed':
        return {
          icon: <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
          dotBg: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300',
          badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
        };
      case 'owner_change':
        return {
          icon: <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
          dotBg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
        };
      case 'status_closed':
        if (title.toLowerCase().includes('quitado')) {
          return {
            icon: <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
            dotBg: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/60 dark:border-emerald-700 dark:text-emerald-200',
            badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700'
          };
        }
        return {
          icon: <Archive className="w-3 h-3 text-rose-600 dark:text-rose-400" />,
          dotBg: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/60 dark:border-rose-700 dark:text-rose-200',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-700'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3 text-slate-500" />,
          dotBg: 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2">
        <Sparkles className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Nenhum histórico registrado
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Os eventos deste negócio serão listados aqui cronologicamente.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar with total events count and sort order toggle */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Caminho do Negócio
          </span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold font-mono">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Alternar ordem de exibição"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{sortOrder === 'asc' ? 'Criação → Atual' : 'Atual → Criação'}</span>
        </button>
      </div>

      {/* Clean vertical timeline */}
      <div className="relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2.5 before:bottom-2.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 flex flex-col gap-4">
        {sortedEvents.map((event) => {
          const style = getEventIconAndStyle(event.type, event.title);

          return (
            <div key={event.id} className="relative flex flex-col gap-1 text-xs">
              {/* Discrete circular node on timeline line */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border shadow-2xs ${style.dotBg}`}
              >
                {style.icon}
              </div>

              {/* Top info: Date/Time + Actor */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                  {event.timestamp}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.badgeBg}`}
                >
                  {event.actor}
                </span>
              </div>

              {/* Event Title */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {event.title}
                </span>
              </div>

              {/* Event Description */}
              <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                {event.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
