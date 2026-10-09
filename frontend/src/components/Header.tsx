import React, { useEffect, useState } from 'react';
import { Search, LogOut, Moon, Sun, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { CommandPalette } from './CommandPalette';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, onToggleDarkMode }) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase('pt-BR') === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen((current) => !current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Gera as iniciais do nome do usuário para o avatar
  const initials = (user?.name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <header
      className="fixed top-0 left-60 right-0 h-14
                 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl
                 border-b border-slate-200/80 dark:border-slate-800
                 shadow-[0_1px_8px_rgba(0,0,0,0.02)] z-30
                 flex items-center justify-between px-6
                 transition-colors duration-200"
    >
      {/* ── Barra de Busca Global ── */}
      <div className="flex items-center w-80 sm:w-96 md:w-[440px]">
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu(false);
            setIsCommandPaletteOpen(true);
          }}
          className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-left
                        bg-slate-100/90 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-800
                        border border-slate-200/60 dark:border-slate-700
                        text-slate-500 dark:text-slate-400 transition-all">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
          <span className="w-full truncate text-xs text-slate-400 dark:text-slate-500 font-normal">
            Buscar contato, documento ou telefone…
          </span>
        </button>
      </div>

      {/* ── Ações à Direita ── */}
      <div className="flex items-center gap-2">

        {/* Toggle Dark / Light */}
        <button
          type="button"
          id="btn-toggle-dark-mode"
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          aria-label="Alternar modo escuro"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full
                     border border-slate-200/90 dark:border-slate-700
                     text-slate-600 dark:text-slate-200
                     hover:text-slate-900 dark:hover:text-white
                     hover:bg-slate-100 dark:hover:bg-slate-800
                     transition-all cursor-pointer shadow-2xs text-xs font-medium"
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

        {/* Perfil do Usuário */}
        <div className="relative">
          <button
            id="btn-profile-menu"
            onClick={() => setShowProfileMenu((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full
                       hover:bg-slate-100 dark:hover:bg-slate-800
                       transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white
                            flex items-center justify-center text-xs font-bold
                            shadow-sm shadow-indigo-200 dark:shadow-none">
              {initials}
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline max-w-[120px] truncate">
              {user?.name ?? '—'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
          </button>

          {/* Dropdown */}
          {showProfileMenu && (
            <div
              className="absolute right-0 mt-2 w-56
                         bg-white dark:bg-slate-900 rounded-xl
                         shadow-xl border border-slate-200 dark:border-slate-800
                         p-2 z-50"
            >
              {/* Info do usuário */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>

              {/* Sair */}
              <button
                id="btn-logout"
                onClick={async () => {
                  setShowProfileMenu(false);
                  await logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5
                           text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40
                           rounded-lg font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </header>
  );
};
