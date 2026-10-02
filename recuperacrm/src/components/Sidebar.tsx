import React from 'react';
import { Kanban, Users, RotateCcw, Handshake, UserCheck } from 'lucide-react';

interface SidebarProps {
  activeTab: 'negocios' | 'contatos' | 'usuarios';
  setActiveTab: (tab: 'negocios' | 'contatos' | 'usuarios') => void;
  dealsCount: number;
  contactsCount: number;
  usersCount?: number;
  onResetDemoData?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  dealsCount,
  contactsCount,
  usersCount = 2,
  onResetDemoData
}) => {
  return (
    <aside
      id="main-sidebar"
      className="w-60 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-200/80 dark:border-slate-800/80 z-40 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)] transition-colors duration-150"
    >
      {/* Brand / Logo Header */}
      <div className="h-16 px-5 flex items-center border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400/30">
            <Handshake className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex items-center tracking-tight">
            <span className="font-display font-extrabold text-[18px] text-slate-900 dark:text-white">
              Progrid
            </span>
            <span className="font-display font-black text-[19px] text-indigo-600 dark:text-indigo-400 ml-0.5">
              +
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation - only Negócios & Contatos */}
      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <button
          id="nav-negocios"
          onClick={() => setActiveTab('negocios')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
            activeTab === 'negocios'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Kanban
              className={`w-4 h-4 ${
                activeTab === 'negocios'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span>Negócios</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'negocios'
                ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {dealsCount}
          </span>
        </button>

        <button
          id="nav-contatos"
          onClick={() => setActiveTab('contatos')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
            activeTab === 'contatos'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users
              className={`w-4 h-4 ${
                activeTab === 'contatos'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span>Contatos</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'contatos'
                ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {contactsCount}
          </span>
        </button>

        <button
          id="nav-usuarios"
          onClick={() => setActiveTab('usuarios')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
            activeTab === 'usuarios'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <UserCheck
              className={`w-4 h-4 ${
                activeTab === 'usuarios'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            />
            <span>Usuários</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              activeTab === 'usuarios'
                ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {usersCount}
          </span>
        </button>

        {onResetDemoData && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              onClick={onResetDemoData}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
              title="Restaurar dados demonstrativos originais com todos os títulos agrupados"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restaurar Dados Demo</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
