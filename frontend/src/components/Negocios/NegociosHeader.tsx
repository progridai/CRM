import React from 'react';
import { Search, Kanban, List, Plus, TrendingUp, Wallet, Clock, PhoneMissed, Target } from 'lucide-react';
import type { ViewMode } from '../../types';
import { formatCurrency } from '../../utils';
import type { NegocioDto, EtapaDto } from '../../services/negociosService';

interface NegociosHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onNovoNegocio: () => void;
  negocios?: NegocioDto[];
  etapas?: EtapaDto[];
}

function computeIndicators(negocios: NegocioDto[], etapas: EtapaDto[]) {
  // 1. Saldo a recuperar: Not quitado
  const abertos = negocios.filter(n => n.etapaCodigo !== 'quitado');
  const saldoRecuperar = abertos.reduce((s, n) => s + n.valor, 0);
  const clientesAbertos = abertos.length;

  // 2. Recuperado no mês: Quitado
  const quitados = negocios.filter(n => n.etapaCodigo === 'quitado');
  const recuperadoMes = quitados.reduce((s, n) => s + n.valor, 0);
  const clientesQuitados = quitados.length;

  // 3. Aguardando pagamento
  const aguardando = negocios.filter(n => n.etapaCodigo === 'aguardando_pagamento');
  const aguardandoValor = aguardando.reduce((s, n) => s + n.valor, 0);
  const clientesAguardando = aguardando.length;

  // 4. Sem contato (No protótipo era 'nova_posicao')
  const semContato = negocios.filter(n => n.etapaCodigo === 'nova_posicao');
  const semContatoValor = semContato.reduce((s, n) => s + n.valor, 0);
  const clientesSemContato = semContato.length;

  // 5. Progresso da meta
  const metaValor = saldoRecuperar + recuperadoMes;
  const metaPercent = metaValor > 0 ? Math.min(100, Math.round((recuperadoMes / metaValor) * 100)) : 0;

  return {
    saldoRecuperar, clientesAbertos,
    recuperadoMes, clientesQuitados,
    aguardandoValor, clientesAguardando,
    semContatoValor, clientesSemContato,
    metaValor,
    metaPercent,
  };
}

export const NegociosHeader: React.FC<NegociosHeaderProps> = ({
  viewMode,
  setViewMode,
  onNovoNegocio,
  negocios = [],
  etapas = [],
}) => {
  const ind = computeIndicators(negocios, etapas);

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

      {/* ── Indicator Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

        {/* 1 — Saldo a Recuperar */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo a Recuperar</span>
            <Wallet className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
            {formatCurrency(ind.saldoRecuperar)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.clientesAbertos} {ind.clientesAbertos === 1 ? 'posição em aberto' : 'posições em aberto'}
          </span>
        </div>

        {/* 2 — Recuperado no Mês */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recuperado no Mês</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            {formatCurrency(ind.recuperadoMes)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.clientesQuitados} {ind.clientesQuitados === 1 ? 'posição quitada' : 'posições quitadas'}
          </span>
        </div>

        {/* 3 — Aguardando Pagamento */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aguardando Pagamento</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-amber-600 dark:text-amber-400 leading-none">
            {formatCurrency(ind.aguardandoValor)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.clientesAguardando} {ind.clientesAguardando === 1 ? 'negociação acordada' : 'negociações acordadas'}
          </span>
        </div>

        {/* 4 — Sem Contato */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sem Contato</span>
            <PhoneMissed className="w-3.5 h-3.5 text-rose-400 dark:text-rose-600" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-rose-600 dark:text-rose-400 leading-none">
            {formatCurrency(ind.semContatoValor)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {ind.clientesSemContato} {ind.clientesSemContato === 1 ? 'devedor inalcançável' : 'devedores inalcançáveis'}
          </span>
        </div>

        {/* 5 — Progresso da Meta */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-1 hidden lg:flex">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progresso da Meta</span>
            <div className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-600" />
              <span className={`text-[10px] font-bold ${ind.metaPercent >= 100 ? 'text-emerald-600' : ind.metaPercent >= 50 ? 'text-amber-600' : 'text-indigo-600'} dark:text-indigo-400`}>
                {ind.metaPercent}%
              </span>
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              {formatCurrency(ind.recuperadoMes)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              / {formatCurrency(ind.metaValor || ind.saldoRecuperar)}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-1.5 mt-1 overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                ind.metaPercent >= 100 ? 'bg-emerald-500' : ind.metaPercent >= 50 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${ind.metaPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
