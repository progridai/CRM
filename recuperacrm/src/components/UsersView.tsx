import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { AppUser, Deal } from '../types';
import { formatCurrency } from '../utils';

interface UsersViewProps {
  users: AppUser[];
  deals: Deal[];
  onFilterByOperator?: (operatorName: string) => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  deals,
  onFilterByOperator
}) => {
  const [search, setSearch] = useState('');

  // Cálculos dinâmicos baseados diretamente nos negócios mockados/cadastrados
  const computedUsers = users.map((user) => {
    // Filtrar negócios do operador (por nome)
    const userDeals = deals.filter(
      (d) => d.owner?.trim().toLowerCase() === user.name.trim().toLowerCase()
    );

    // Posições em aberto = quantidade de posições que ainda não estão quitadas
    const openDeals = userDeals.filter((d) => d.status !== 'quitado');
    const openCount = openDeals.length;

    // Posições recuperadas = quantidade de posições na etapa Quitado
    const recoveredDeals = userDeals.filter((d) => d.status === 'quitado');
    const recoveredCount = recoveredDeals.length;

    // Recuperado no mês = soma dos valores das posições Quitado dentro do período atual
    const recoveredAmount = recoveredDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    return {
      ...user,
      openCount,
      recoveredCount,
      recoveredAmount
    };
  });

  const filteredUsers = computedUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase())
  );

  // Totais do topo: exatamente a soma dos valores exibidos na tabela por usuário
  const totalOpenPositions = computedUsers.reduce((sum, u) => sum + u.openCount, 0);
  const totalRecoveredPositions = computedUsers.reduce((sum, u) => sum + u.recoveredCount, 0);
  const totalRecoveredMonth = computedUsers.reduce((sum, u) => sum + u.recoveredAmount, 0);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Usuários
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome do usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 shadow-2xs transition-colors"
          />
        </div>
      </div>

      {/* 3 Indicadores de Desempenho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* 1. Posições em aberto */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Posições em aberto
            </span>
            <span className="font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {totalOpenPositions}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              Em andamento
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Posições recuperadas */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Posições recuperadas
            </span>
            <span className="font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {totalRecoveredPositions}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
              Acordos quitados
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Recuperado no mês */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Recuperado no mês
            </span>
            <span className="font-display text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(totalRecoveredMonth)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              Volume conciliado
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabela Clean de Usuários */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
            Desempenho por Usuário
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">Usuário</th>
                <th className="p-4 text-center">Posições em aberto</th>
                <th className="p-4 text-center">Posições recuperadas</th>
                <th className="p-4 text-right">Recuperado no mês</th>
                {onFilterByOperator && <th className="p-4 text-center w-32">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={onFilterByOperator ? 5 : 4} className="p-8 text-center text-slate-400">
                    Nenhum usuário encontrado com o termo pesquisado.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isHelena = user.name.toLowerCase().includes('helena');

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Usuário (avatar com cores diferentes para Helena e Ymalaia + nome) */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border shadow-2xs shrink-0 ${
                              isHelena
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            {user.avatar || user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                              {user.fullName || user.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Posições em aberto */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>{user.openCount}</span>
                        </span>
                      </td>

                      {/* Posições recuperadas */}
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{user.recoveredCount}</span>
                        </span>
                      </td>

                      {/* Recuperado no mês */}
                      <td className="p-4 text-right">
                        <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                          {formatCurrency(user.recoveredAmount)}
                        </span>
                      </td>

                      {/* Ações */}
                      {onFilterByOperator && (
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => onFilterByOperator(user.name)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer"
                            title={`Filtrar negócios de ${user.name}`}
                          >
                            <span>Ver Negócios</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
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
