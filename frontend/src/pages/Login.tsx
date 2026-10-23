import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export const Login: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    setIsRedirecting(true);
    try {
      await login();
    } catch {
      setError('Não foi possível continuar. Tente novamente em instantes.');
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-[var(--color-background)] px-5 py-10">
      <section aria-labelledby="login-title" className="w-full max-w-sm rounded-2xl border border-slate-200/70 bg-[var(--color-surface)] px-7 py-9 text-center shadow-sm sm:px-9 dark:border-slate-800">
        <div className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400" style={{ fontFamily: 'var(--font-display)' }}>
          Progrid<span className="text-amber-500">+</span>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Recuperação de Crédito e CRM</p>

        <h1 id="login-title" className="mt-9 text-xl font-semibold tracking-tight text-slate-900">Boas-vindas!</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Entre com sua conta corporativa para continuar.</p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={isRedirecting}
          aria-busy={isRedirecting}
          className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--color-surface)] disabled:cursor-wait disabled:opacity-70"
        >
          {isRedirecting && <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {isRedirecting ? 'Conectando…' : 'Entrar'}
        </button>
        {error && <p role="alert" className="mt-3 text-sm leading-relaxed text-rose-600 dark:text-rose-400">{error}</p>}

        <p className="mt-6 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Precisa de acesso? Fale com seu administrador.</p>
      </section>
    </main>
  );
};
