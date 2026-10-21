import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Handshake, ShieldCheck, Briefcase, FileUp } from 'lucide-react';

interface SidebarProps {
  negociosCount?: number;
  contactsCount?: number;
  usersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ negociosCount, contactsCount, usersCount }) => {
  return (
    <aside
      id="main-sidebar"
      className="w-60 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200
                 flex flex-col h-screen fixed left-0 top-0
                 border-r border-slate-200/80 dark:border-slate-800/80
                 z-40 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]
                 transition-colors duration-150"
    >
      {/* ── Cabeçalho / Logo ── */}
      <div className="h-16 px-5 flex items-center border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700
                          flex items-center justify-center text-white
                          shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-400/30">
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

      {/* ── Navegação ── */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">

        {/* Negócios */}
        <NavLink
          id="nav-negocios"
          to="/negocios"
          className={({ isActive }) =>
            `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              isActive
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-2.5">
                <Briefcase
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>Negócios</span>
              </div>
              {negociosCount !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {negociosCount.toLocaleString('pt-BR')}
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Importação */}
        <NavLink
          id="nav-importacoes"
          to="/importacoes"
          className={({ isActive }) =>
            `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              isActive
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <div className="flex items-center gap-2.5">
              <FileUp
                className={`w-4 h-4 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              />
              <span>Importar dados</span>
            </div>
          )}
        </NavLink>

        {/* Contatos */}
        <NavLink
          id="nav-contatos"
          to="/contatos"
          className={({ isActive }) =>
            `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              isActive
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-2.5">
                <Users
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>Contatos</span>
              </div>
              {contactsCount !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {contactsCount.toLocaleString('pt-BR')}
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Usuários */}
        <NavLink
          id="nav-usuarios"
          to="/usuarios"
          className={({ isActive }) =>
            `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              isActive
                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/60 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-2.5">
                <ShieldCheck
                  className={`w-4 h-4 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span>Usuários</span>
              </div>
              {usersCount !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isActive
                    ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {usersCount.toLocaleString('pt-BR')}
                </span>
              )}
            </>
          )}
        </NavLink>

      </nav>
    </aside>
  );
};
