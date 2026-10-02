import React, { useState } from 'react';
import { Search, LogOut, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenNewDealModal?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.02)] z-30 flex items-center justify-between px-6 transition-colors duration-200">
      {/* Search Bar */}
      <div className="flex items-center w-80 sm:w-96 md:w-[440px]">
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center w-full gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700 transition-all text-left group cursor-pointer"
        >
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
          <span className="w-full text-xs text-slate-500 dark:text-slate-400 font-normal whitespace-nowrap overflow-hidden text-ellipsis">
            Buscar devedor, contrato ou documento
          </span>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle Button (to the left of profile) */}
        <button
          type="button"
          onClick={onToggleDarkMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs text-xs font-medium"
          title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          aria-label="Alternar modo escuro"
        >
          {isDarkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium hidden md:inline text-slate-200">Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[11px] font-medium hidden md:inline text-slate-600">Escuro</span>
            </>
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-indigo-200 dark:shadow-none">
              H
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
              Helena
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Helena</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">helena@gmail.com</p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
