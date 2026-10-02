import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { LogOut, User as UserIcon } from 'lucide-react';
import { api } from '../services/api';

export const Home: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/users/profile');
        setProfile(response.data);
      } catch (err: any) {
        console.error('Erro ao buscar perfil:', err);
        setError(err.response?.data?.message || 'Falha ao buscar perfil local no CRM.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Topbar Simplificada */}
      <header className="flex h-14 items-center justify-between bg-[var(--color-surface)] px-6 shadow-sm border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-[var(--color-primary-600)]">Progrid<span className="text-amber-500">+</span></h1>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
              <UserIcon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.name}</span>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-1.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs font-medium">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-5xl p-8">
        <h2 className="mb-6 text-2xl font-bold text-slate-800 dark:text-white">Página Inicial</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card Keycloak */}
          <div className="rounded-xl bg-[var(--color-surface)] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">Identidade (Keycloak)</h3>
            <div className="space-y-3 text-sm">
              <p><strong className="text-slate-500">ID (sub):</strong> <span className="font-mono text-xs">{user?.id}</span></p>
              <p><strong className="text-slate-500">Nome:</strong> {user?.name}</p>
              <p><strong className="text-slate-500">Username:</strong> {user?.username}</p>
              <p><strong className="text-slate-500">E-mail:</strong> {user?.email}</p>
              <p><strong className="text-slate-500">Roles:</strong> {user?.roles.join(', ') || 'Nenhuma role'}</p>
            </div>
          </div>

          {/* Card CRM Profile */}
          <div className="rounded-xl bg-[var(--color-surface)] p-6 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">Perfil Local (Progrid+)</h3>
            
            {loading ? (
              <p className="text-sm text-slate-500">Carregando dados da API...</p>
            ) : error ? (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <p className="mt-2 text-xs text-red-600">O usuário está autenticado no Keycloak, mas a API do CRM recusou o acesso ou não encontrou o perfil local.</p>
              </div>
            ) : profile ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-md bg-emerald-50 p-3 mb-4 border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800">API Conectada com Sucesso</p>
                </div>
                <p><strong className="text-slate-500">Ativo no CRM:</strong> {profile.isActive ? 'Sim' : 'Não'}</p>
                <p><strong className="text-slate-500">Mensagem:</strong> {profile.message}</p>
                <p><strong className="text-slate-500">Permissões:</strong> {profile.permissions?.join(', ')}</p>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};
