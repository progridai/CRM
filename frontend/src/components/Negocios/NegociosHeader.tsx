import React, { useMemo } from 'react';
import { Search, Kanban, List, Plus } from 'lucide-react';
import type { ViewMode } from '../../types';
import { formatCurrency } from '../../utils';
import type { NegocioDto } from '../../services/negociosService';
import {
  computeIndicators,
  getCompetenceValue,
  type NegociosFilters,
} from './negociosIndicators';

interface NegociosHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNovoNegocio: () => void;
  negocios: NegocioDto[];
  todosNegocios: NegocioDto[];
  filters: NegociosFilters;
  onFiltersChange: (filters: NegociosFilters) => void;
}

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export const NegociosHeader: React.FC<NegociosHeaderProps> = ({
  viewMode,
  setViewMode,
  onNovoNegocio,
  negocios,
  todosNegocios,
  filters,
  onFiltersChange,
}) => {
  const ind = computeIndicators(negocios);

  const competenceOptions = useMemo(() => {
    const options = new Map<string, string>();
    todosNegocios.forEach((negocio) => {
      const value = getCompetenceValue(negocio);
      const month = MESES_ABREV[negocio.competenciaMes - 1] ?? String(negocio.competenciaMes);
      options.set(value, `${month}/${negocio.competenciaAno}`);
    });
    return [...options.entries()]
      .sort(([valueA], [valueB]) => valueB.localeCompare(valueA))
      .map(([value, label]) => ({ value, label }));
  }, [todosNegocios]);

  const originOptions = useMemo(
    () => [...new Set(todosNegocios.map((negocio) => negocio.origem).filter(Boolean) as string[])]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [todosNegocios],
  );

  const ownerOptions = useMemo(
    () => [...new Set(todosNegocios.map((negocio) => negocio.nomeOperador).filter(Boolean) as string[])]
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [todosNegocios],
  );

  return (
    <div className="flex flex-col gap-5 w-full mb-6">
      {/* Top Filter & Toolbar Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-3 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
              placeholder="Filtrar por nome, documento ou referência"
              className="h-8 pl-8 pr-3 w-72 sm:w-80 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs text-slate-400 whitespace-nowrap">Competência:</span>
            <select
              aria-label="Filtrar por competência"
              value={filters.competence}
              onChange={(event) => onFiltersChange({ ...filters, competence: event.target.value })}
              className="text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none cursor-pointer"
            >
              <option value="Todas">Todas</option>
              {competenceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs text-slate-400 whitespace-nowrap">Origem:</span>
            <select
              aria-label="Filtrar por origem"
              value={filters.origin}
              onChange={(event) => onFiltersChange({ ...filters, origin: event.target.value })}
              className="max-w-36 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none cursor-pointer"
            >
              <option value="Todas">Todas</option>
              {originOptions.map((origin) => (
                <option key={origin} value={origin}>{origin}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
            <span className="text-xs text-slate-400 whitespace-nowrap">Operador:</span>
            <select
              aria-label="Filtrar por operador"
              value={filters.owner}
              onChange={(event) => onFiltersChange({ ...filters, owner: event.target.value })}
              className="max-w-36 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none cursor-pointer"
            >
              <option value="Todos">Todos</option>
              {ownerOptions.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </label>
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

      {/* ── Indicator Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

        {/* 1 — Saldo a Recuperar */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo a Recuperar</span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
            {formatCurrency(ind.openAmount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.openCount} {ind.openCount === 1 ? 'posição em aberto' : 'posições em aberto'}
          </span>
        </div>

        {/* 2 — Recuperado no Mês */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recuperado no Mês</span>
          <span className="font-display text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            {formatCurrency(ind.recoveredAmount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.recoveredCount} {ind.recoveredCount === 1 ? 'posição recuperada' : 'posições recuperadas'}
          </span>
        </div>

        {/* 3 — Aguardando Pagamento */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Pagamento</span>
          <span className="font-display text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 leading-none">
            {formatCurrency(ind.waitingPaymentAmount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.waitingPaymentCount} {ind.waitingPaymentCount === 1 ? 'posição nessa etapa' : 'posições nessa etapa'}
          </span>
        </div>

        {/* 4 — Sem Contato */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem Contato</span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
            {formatCurrency(ind.noContactAmount)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.noContactCount} {ind.noContactCount === 1 ? 'posição nessa etapa' : 'posições nessa etapa'}
          </span>
        </div>

        {/* 5 — Progresso da Meta */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso da Meta</span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {ind.targetPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              {formatCurrency(ind.recoveredAmount)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              / {formatCurrency(ind.targetAmount)}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, ind.targetPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
