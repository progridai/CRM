import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary-600)]">Progrid<span className="text-amber-500">+</span></h1>
          <p className="mt-2 text-sm text-slate-500">Recuperação de Crédito e CRM</p>
        </div>
        
        <div className="space-y-4">
          <p className="text-center text-sm text-slate-600">
            Acesse o sistema utilizando sua conta corporativa.
          </p>
          <button
            onClick={login}
            className="w-full rounded-lg bg-[var(--color-primary-600)] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-2 transition-all cursor-pointer"
          >
            Entrar com Keycloak
          </button>
        </div>
      </div>
    </div>
  );
};
