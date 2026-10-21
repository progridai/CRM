import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listarUsuarios } from '../services/usuariosService';
import type { UsuarioDto, UsuarioResumoDto } from '../services/usuariosService';
import { formatCurrency } from '../utils';
import { getWebApoliceNovoUsuarioUrl, getWebApoliceUsuarioUrl } from '../config/webApolice';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Gera iniciais a partir do nome completo (até 2 palavras) */
function gerarIniciais(nome: string): string {
  return nome
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Paleta de cores cíclica para os avatares */
const AVATAR_PALETTES = [
  'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
];

const DEBOUNCE_MS = 350;

// ─── Componente ───────────────────────────────────────────────────────────────

export const UsuariosPage: React.FC = () => {
  const navigate = useNavigate();
  const [busca, setBusca]           = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [usuarios, setUsuarios]     = useState<UsuarioDto[]>([]);
  const [total, setTotal]           = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);
  const [resumo, setResumo] = useState<UsuarioResumoDto>({
    posicoesEmAberto: 0,
    posicoesRecuperadas: 0,
    recuperadoNoMes: 0,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBuscaInput(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBusca(valor.trim());
    }, DEBOUNCE_MS);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listarUsuarios(busca);
      setUsuarios(resultado.itens);
      setTotal(resultado.total);
      setResumo(resultado.resumo ?? {
        posicoesEmAberto: 0,
        posicoesRecuperadas: 0,
        recuperadoNoMes: 0,
      });
    } catch (err: any) {
      setErro(
        err?.response?.data?.message ??
          'Falha ao carregar usuários. Verifique a conexão com a API.'
      );
    } finally {
      setCarregando(false);
    }
  }, [busca]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Usuários
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {carregando
              ? 'Carregando…'
              : `${total} ${total === 1 ? 'usuário encontrado' : 'usuários encontrados'}`}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Busca */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="input-busca-usuarios"
              type="text"
              placeholder="Buscar por nome, username ou e-mail…"
              value={buscaInput}
              onChange={handleBuscaChange}
              className="w-full h-9 pl-9 pr-3 rounded-xl
                         bg-white dark:bg-slate-900
                         border border-slate-200 dark:border-slate-700
                         text-xs text-slate-800 dark:text-slate-100
                         placeholder:text-slate-400 dark:placeholder:text-slate-500
                         outline-none focus:border-indigo-500 shadow-2xs transition-colors"
            />
          </div>

          <a
            href={getWebApoliceNovoUsuarioUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            title="Cadastrar novo usuário no WebApólice"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            <span>Novo usuário</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-75" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* ── Cards de indicadores ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Posições em aberto */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Posições em aberto
            </span>
            <span className="font-display text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {resumo.posicoesEmAberto}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              Em andamento
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Posições recuperadas */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Posições recuperadas
            </span>
            <span className="font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {resumo.posicoesRecuperadas}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
              Acordos quitados
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Recuperado no mês */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1">
              Recuperado no mês
            </span>
            <span className="font-display text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(resumo.recuperadoNoMes)}
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

      {/* ── Erro ── */}
      {erro && (
        <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-200 dark:border-rose-800 p-4">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{erro}</p>
          </div>
          <button
            onClick={carregar}
            className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </button>
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-200">
            Desempenho por Usuário
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {carregando ? '…' : `${usuarios.length} ${usuarios.length === 1 ? 'usuário' : 'usuários'}`}
          </span>
        </div>

        {/* Loading */}
        {carregando && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm">Carregando usuários…</span>
          </div>
        )}

        {/* Tabela de dados */}
        {!carregando && !erro && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700
                               text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Usuário</th>
                  <th className="p-4 text-center">Posições em aberto</th>
                  <th className="p-4 text-center">Posições recuperadas</th>
                  <th className="p-4 text-right">Recuperado no mês</th>
                  <th className="p-4 text-center w-64">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">
                      {busca
                        ? `Nenhum usuário encontrado para "${busca}".`
                        : 'Nenhum usuário ativo encontrado.'}
                    </td>
                  </tr>
                ) : (
                  usuarios.map((u, index) => {
                    const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length];
                    const iniciais = gerarIniciais(u.nome || u.username);
                    return (
                      <tr
                        key={u.usuarioId}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Usuário */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                            text-sm font-bold border shadow-2xs shrink-0 ${palette}`}>
                              {iniciais}
                            </div>
                            <div>
                              <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 block">
                                {u.nome || u.username}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {u.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Posições em aberto */}
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                           bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300
                                           border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>{u.posicoesEmAberto ?? 0}</span>
                          </span>
                        </td>

                        {/* Posições recuperadas */}
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                                           bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300
                                           border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{u.posicoesRecuperadas ?? 0}</span>
                          </span>
                        </td>

                        {/* Recuperado no mês */}
                        <td className="p-4 text-right">
                          <span className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                            {formatCurrency(u.recuperadoNoMes ?? 0)}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="p-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {u.usuarioPublicId ? (
                              <a
                                href={getWebApoliceUsuarioUrl(u.usuarioPublicId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-colors"
                                title={`Abrir cadastro de ${u.nome || u.username} no WebApólice`}
                              >
                                <span>Ver Cadastro</span>
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            ) : (
                              <span
                                aria-disabled="true"
                                className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-600"
                                title="Recarregue a página após reiniciar a API do Progrid+"
                              >
                                <span>Ver Cadastro</span>
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => navigate(`/negocios?operador=${encodeURIComponent(u.nome)}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer"
                              title={`Filtrar negócios de ${u.nome}`}
                            >
                              <span>Ver Negócios</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
