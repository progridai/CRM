import React, { useState } from 'react';
import {
  DownloadCloud,
  ArrowRightLeft,
  CheckCircle2,
  UserCheck,
  CheckCheck,
  ArrowUpDown,
  Clock,
  Sparkles,
  Plus
} from 'lucide-react';
import type { HistoricoDto } from '../../services/negociosService';

interface DealHistoryTimelineProps {
  events: HistoricoDto[];
}

export const DealHistoryTimeline: React.FC<DealHistoryTimelineProps> = ({ events }) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const sortedEvents = [...events].sort((a, b) => {
    const timeA = new Date(a.ocorridoEm).getTime();
    const timeB = new Date(b.ocorridoEm).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const getEventTitle = (tipo: string) => {
    switch (tipo) {
      case 'criado':
        return 'Negócio criado';
      case 'importado':
        return 'Negócio importado';
      case 'mudanca_etapa':
      case 'etapa_alterada':
        return 'Etapa alterada';
      case 'atividade_registrada':
        return 'Atividade registrada';
      case 'operador_alterado':
        return 'Responsável alterado';
      case 'encerrado':
        return 'Negócio encerrado';
      default:
        return 'Evento registrado';
    }
  };

  const getEventIconAndStyle = (type: string) => {
    switch (type) {
      case 'criado':
        return {
          icon: <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          dotBg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
        };
      case 'importado':
        return {
          icon: <DownloadCloud className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />,
          dotBg: 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300',
          badgeBg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        };
      case 'mudanca_etapa':
      case 'etapa_alterada':
        return {
          icon: <ArrowRightLeft className="w-3 h-3 text-blue-600 dark:text-blue-400" />,
          dotBg: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
        };
      case 'atividade_registrada':
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          dotBg: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
        };
      case 'operador_alterado':
        return {
          icon: <UserCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />,
          dotBg: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
        };
      case 'encerrado':
        return {
          icon: <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />,
          dotBg: 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/60 dark:border-emerald-700 dark:text-emerald-200',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700'
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
          const title = getEventTitle(event.tipoEvento);
          const style = getEventIconAndStyle(event.tipoEvento);
          const formattedDate = new Date(event.ocorridoEm).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'short',
            timeStyle: 'short'
          });

          return (
            <div key={event.id} className="relative flex flex-col gap-1 text-xs">
              {/* Discrete circular node on timeline line */}
              <div
                className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border shadow-xs ${style.dotBg}`}
              >
                {style.icon}
              </div>

              {/* Top info: Date/Time + Actor */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                  {formattedDate}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.badgeBg}`}
                >
                  {event.nomeUsuario}
                </span>
              </div>

              {/* Event Title */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {title}
                </span>
              </div>

              {/* Event Description */}
              {event.descricao && (
                <p className="text-slate-600 dark:text-slate-300 text-[11.5px] leading-relaxed">
                  {event.descricao}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
