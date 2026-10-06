import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, User, Phone, FileText, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { listarContatos } from '../services/contatosService';
import type { ContatoDto } from '../services/contatosService';

// ─── Formatadores ──────────────────────────────────────────────────────────────

/** Formata CPF: 000.000.000-00 */
function formatCpf(doc: string): string {
  const d = doc.replace(/\D/g, '');
  if (d.length !== 11) return doc;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

/** Formata CNPJ: 00.000.000/0000-00 */
function formatCnpj(doc: string): string {
  const d = doc.replace(/\D/g, '');
  if (d.length !== 14) return doc;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

function formatDocumento(doc: string, tipoPessoa: number): string {
  if (!doc) return '—';
  const limpo = doc.replace(/\D/g, '');
  if (tipoPessoa === 1 && limpo.length === 11) return formatCpf(limpo);
  if (tipoPessoa === 2 && limpo.length === 14) return formatCnpj(limpo);
  return doc; // já formatado ou desconhecido
}

/** Formata telefone: (99) 99999-9999 ou (99) 9999-9999 */
function formatTelefone(tel: string): string {
  if (!tel) return '—';
  const d = tel.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

/** Capitaliza o nome (todas as palavras com >= 3 letras) */
function formatNome(nome: string): string {
  const artigos = new Set(['de','da','do','das','dos','e','a','o','em','na','no']);
  return nome
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i === 0 || !artigos.has(p)) ? p.charAt(0).toUpperCase() + p.slice(1) : p)
    .join(' ');
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const TAMANHO_PAGINA = 50;
const DEBOUNCE_MS    = 350;

// ─── Componente ───────────────────────────────────────────────────────────────

export const ContatosPage: React.FC = () => {
  const [busca, setBusca]           = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [contatos, setContatos]     = useState<ContatoDto[]>([]);
  const [total, setTotal]           = useState(0);
  const [pagina, setPagina]         = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Busca com debounce ────────────────────────────────────────────────────
  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBuscaInput(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBusca(valor.trim());
      setPagina(1);
    }, DEBOUNCE_MS);
  };

  // ── Carregamento ─────────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await listarContatos(busca, pagina, TAMANHO_PAGINA);
      setContatos(resultado.itens);
      setTotal(resultado.total);
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Falha ao carregar contatos. Verifique a conexão com a API.');
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalPaginas = Math.ceil(total / TAMANHO_PAGINA);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">

      {/* ── Cabeçalho da Página ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Contatos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {carregando
              ? 'Carregando…'
              : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'contato encontrado' : 'contatos encontrados'}`}
          </p>
        </div>

        {/* Campo de Busca */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            id="input-busca-contatos"
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou telefone"
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
      </div>

      {/* ── Estado de Erro ── */}
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

        {/* Loading overlay na tabela */}
        {carregando && (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span className="text-sm">Carregando contatos…</span>
          </div>
        )}

        {/* Tabela de dados */}
        {!carregando && !erro && (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700
                             text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    Nome Completo / Razão Social
                  </div>
                </th>
                <th className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    CPF / CNPJ
                  </div>
                </th>
                <th className="p-3.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3" />
                    Telefone Principal
                  </div>
                </th>
                {/* Colunas previstas — sem dados nesta fase */}
                <th className="p-3.5 text-slate-300 dark:text-slate-600">Origem</th>
                <th className="p-3.5 text-slate-300 dark:text-slate-600">Total em Débito</th>
                <th className="p-3.5 text-slate-300 dark:text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contatos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">
                    {busca
                      ? `Nenhum contato encontrado para "${busca}".`
                      : 'Nenhum contato cadastrado.'}
                  </td>
                </tr>
              ) : (
                contatos.map((c) => (
                  <tr
                    key={c.pessoaId}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Nome */}
                    <td className="p-3.5 pl-4 font-semibold text-slate-900 dark:text-slate-100 max-w-xs">
                      <span className="truncate block">{formatNome(c.nome)}</span>
                      {/* Badge tipo pessoa */}
                      <span className={`inline-block mt-0.5 text-[9px] font-medium px-1.5 py-px rounded-full ${
                        c.tipoPessoa === 2
                          ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {c.tipoPessoa === 2 ? 'Jurídica' : 'Física'}
                      </span>
                    </td>

                    {/* Documento */}
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                      {formatDocumento(c.documento, c.tipoPessoa)}
                    </td>

                    {/* Telefone */}
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {c.telefonePrincipal ? formatTelefone(c.telefonePrincipal) : (
                        <span className="text-slate-300 dark:text-slate-600 italic">—</span>
                      )}
                    </td>

                    {/* Colunas futuras — placeholder visual */}
                    <td className="p-3.5 text-slate-300 dark:text-slate-700">—</td>
                    <td className="p-3.5 text-slate-300 dark:text-slate-700">—</td>
                    <td className="p-3.5 text-slate-300 dark:text-slate-700">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Paginação ── */}
      {!carregando && !erro && totalPaginas > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Página {pagina} de {totalPaginas} —{' '}
            {((pagina - 1) * TAMANHO_PAGINA + 1).toLocaleString('pt-BR')} a{' '}
            {Math.min(pagina * TAMANHO_PAGINA, total).toLocaleString('pt-BR')} de{' '}
            {total.toLocaleString('pt-BR')}
          </span>

          <div className="flex items-center gap-2">
            <button
              id="btn-pagina-anterior"
              disabled={pagina <= 1}
              onClick={() => setPagina((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-900 font-medium text-slate-600 dark:text-slate-300
                         hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            <button
              id="btn-proxima-pagina"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700
                         bg-white dark:bg-slate-900 font-medium text-slate-600 dark:text-slate-300
                         hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40
                         disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
