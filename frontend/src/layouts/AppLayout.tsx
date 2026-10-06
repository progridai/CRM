import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

/**
 * Layout padrão do CRM: Sidebar fixa + Header fixo + área de conteúdo.
 * Todas as rotas protegidas são renderizadas dentro do <Outlet />.
 */
export const AppLayout: React.FC = () => {
  // Dark mode — persiste no localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('crm_dark_mode') === 'true';
  });

  // Aplica/remove a classe "dark" no <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('crm_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  return (
    <div className="min-h-screen flex transition-colors duration-200 bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />

      {/* Área principal com deslocamento à direita da sidebar */}
      <div className="pl-60 flex-1 flex flex-col min-w-0">
        {/* Header fixo no topo */}
        <Header
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        />

        {/* Conteúdo da rota ativa */}
        <main className="w-full pt-14 px-6 pb-12 min-h-screen transition-colors duration-200">
          <div className="pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
