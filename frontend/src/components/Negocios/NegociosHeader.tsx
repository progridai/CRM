import React from 'react';
import { Search, Filter, Kanban, List, Plus } from 'lucide-react';
import type { ViewMode } from '../../types';
import { formatCurrency } from '../../utils';

interface NegociosHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNovoNegocio: () => void;
}

export const NegociosHeader: React.FC<NegociosHeaderProps> = ({
  viewMode,
  setViewMode,
  onNovoNegocio,
}) => {
  return (
    <div className="flex flex-col gap-5 w-full mb-6">
      {/* Top Filter & Toolbar Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-3 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por nome, documento ou referência"
              className="h-8 pl-8 pr-3 w-72 sm:w-80 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all font-medium"
              readOnly
            />
          </div>

          {/* Filtros individuais */}
          <div className="relative">
            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-80"
            >
              <span className="text-slate-400 font-normal">Competência:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Todas</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-80"
            >
              <span className="text-slate-400 font-normal">Origem:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Todas</span>
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              className="h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 cursor-not-allowed opacity-80"
            >
              <span className="text-slate-400 font-normal">Operador:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Todos</span>
            </button>
          </div>
        </div>

        {/* Right: View Mode Toggle & Primary Action */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Create Deal Button */}
          <button
            id="btn-novo-negocio"
            type="button"
            onClick={onNovoNegocio}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Negócio</span>
          </button>
        </div>
      </div>

      {/* Portfolio Indicators and Progress Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Saldo a recuperar', value: 0, color: 'text-slate-900 dark:text-slate-100', subtitle: '0 posições em aberto' },
          { label: 'Recuperado no mês', value: 0, color: 'text-emerald-600 dark:text-emerald-400', subtitle: '0 posições quitadas' },
          { label: 'Aguardando pagamento', value: 0, color: 'text-amber-600 dark:text-amber-400', subtitle: '0 negociações acordadas' },
          { label: 'Sem contato', value: 0, color: 'text-rose-600 dark:text-rose-400', subtitle: '0 devedores inalcançáveis' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {stat.label}
              </span>
              <span className={`font-display text-lg font-bold tracking-tight mt-0.5 block ${stat.color}`}>
                {formatCurrency(stat.value)}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
              {stat.subtitle}
            </span>
          </div>
        ))}
        
        {/* Goal Progress */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between hidden lg:flex">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Progresso da meta
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                0%
              </span>
            </div>
            <div className="flex items-end gap-1.5 mt-0.5">
              <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {formatCurrency(0)}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium pb-0.5">
                / {formatCurrency(0)}
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: '0%' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
