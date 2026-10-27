import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getKeycloakInstance, initKeycloakOnce } from './keycloak';
import { setTokenProvider } from '../services/api';
import { obterPerfilLogado } from '../services/usuariosService';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
}

export interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractUser(kc: ReturnType<typeof getKeycloakInstance>): AuthUser | null {
  if (!kc.authenticated || !kc.tokenParsed) return null;
  const token = kc.tokenParsed as any;
  const realmRoles = token['realm_access']?.roles ?? [];

  return {
    id: token['sub'] ?? '',
    username: token['preferred_username'] ?? '',
    name: token['name'] ?? [token['given_name'], token['family_name']].filter(Boolean).join(' '),
    email: token['email'] ?? '',
    roles: realmRoles,
    isAdmin: false,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  
  const kc = getKeycloakInstance();
  const tokenRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const authenticated = await initKeycloakOnce({
          onLoad: 'check-sso',
          pkceMethod: 'S256',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          checkLoginIframe: false,
        });

        if (!mounted) return;

        if (authenticated) {
          setIsAuthenticated(true);
          setTokenProvider(async () => kc.token);
          const tokenUser = extractUser(kc);
          setUser(tokenUser);
          try {
            const profile = await obterPerfilLogado();
            if (mounted && tokenUser) {
              setUser({
                ...tokenUser,
                username: profile.username || tokenUser.username,
                name: profile.nome || tokenUser.name,
                email: profile.email || tokenUser.email,
                isAdmin: profile.acessoTotal === true,
              });
            }
          } catch (profileError) {
            console.error('Falha ao carregar o perfil local do CRM', profileError);
          }
        } else {
          setIsAuthenticated(false);
          setTokenProvider(null);
        }
      } catch (err) {
        console.error('Falha ao inicializar Keycloak', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [kc]);

  useEffect(() => {
    if (!isAuthenticated) return;

    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        const refreshed = await kc.updateToken(60);
        if (refreshed) {
          const refreshedUser = extractUser(kc);
          setUser((current) => refreshedUser
            ? { ...refreshedUser, isAdmin: current?.isAdmin ?? false }
            : null);
          setTokenProvider(async () => kc.token);
        }
      } catch {
        setTokenProvider(null);
        setIsAuthenticated(false);
        setUser(null);
        await kc.logout();
      }
    }, 30_000);

    return () => {
      if (tokenRefreshIntervalRef.current) clearInterval(tokenRefreshIntervalRef.current);
    };
  }, [isAuthenticated, kc]);

  const login = () => kc.login();

  const logout = async () => {
    // 1. Captura dados necessários antes de limpar o estado
    const idToken = kc.idToken;
    const refreshToken = kc.refreshToken;

    // 2. Limpa estado local imediatamente (evita flash de UI autenticada)
    setIsAuthenticated(false);
    setUser(null);
    setTokenProvider(null);
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
      tokenRefreshIntervalRef.current = null;
    }
    kc.clearToken();

    // 3. Invalida a sessão server-side no Keycloak via POST (sem post_logout_redirect_uri)
    //    Isso encerra a sessão SSO sem depender de redirect URI cadastrado.
    try {
      const logoutUrl = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}/protocol/openid-connect/logout`;
      const body = new URLSearchParams({
        client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
        ...(idToken ? { id_token_hint: idToken } : {}),
      });
      await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch {
      // Falha silenciosa: sessão local já foi limpa acima
    }

    // 4. Redireciona para a tela de login do CRM (não para o Keycloak)
    window.location.href = window.location.origin;
  };

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
