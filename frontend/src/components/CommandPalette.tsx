import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Loader2, Plus, Search, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listarContatos, type ContatoDto } from '../services/contatosService';
import { listarNegocios, type NegocioDto } from '../services/negociosService';
import { formatCurrency, getNameInitial } from '../utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult =
  | { type: 'negocio'; item: NegocioDto }
  | { type: 'contato'; item: ContatoDto };

const normalizeSearch = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [negocios, setNegocios] = useState<NegocioDto[]>([]);
  const [contatos, setContatos] = useState<ContatoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setActiveIndex(0);
    setLoading(true);
    setError(null);

    Promise.all([listarNegocios(), listarContatos('', 1, 200)])
      .then(([negociosResponse, contatosResponse]) => {
        setNegocios(negociosResponse);
        setContatos(contatosResponse.itens);
      })
      .catch(() => setError('Não foi possível carregar os dados da busca.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const normalizedQuery = normalizeSearch(query);

  const filteredNegocios = useMemo(() => {
    if (!normalizedQuery) return negocios;

    return negocios.filter((negocio) =>
      [
        negocio.nomeCliente,
        negocio.documento,
        negocio.telefonePrincipal,
        negocio.referencia,
      ].some((value) => normalizeSearch(value).includes(normalizedQuery)),
    );
  }, [negocios, normalizedQuery]);

  const filteredContatos = useMemo(() => {
    if (!normalizedQuery) return contatos;

    return contatos.filter((contato) =>
      [contato.nome, contato.documento, contato.telefonePrincipal].some((value) =>
        normalizeSearch(value).includes(normalizedQuery),
      ),
    );
  }, [contatos, normalizedQuery]);

  const results = useMemo<SearchResult[]>(
    () => [
      ...filteredNegocios.map((item) => ({ type: 'negocio' as const, item })),
      ...filteredContatos.map((item) => ({ type: 'contato' as const, item })),
    ],
    [filteredNegocios, filteredContatos],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const openResult = useCallback((result: SearchResult) => {
    onClose();

    if (result.type === 'negocio') {
      navigate(`/negocios?negocio=${encodeURIComponent(result.item.publicId)}`);
      return;
    }

    const contactQuery = result.item.documento || result.item.nome;
    navigate(`/contatos?busca=${encodeURIComponent(contactQuery)}`);
  }, [navigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (!results.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % results.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + results.length) % results.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        openResult(results[activeIndex] ?? results[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isOpen, onClose, openResult, results]);

  if (!isOpen) return null;

  let resultIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-20 backdrop-blur-xs"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar contato por nome, CPF/CNPJ, referência ou telefone"
            className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="cursor-pointer rounded bg-slate-200/60 px-1.5 py-0.5 text-xs text-slate-500 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Limpar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="cursor-pointer rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-indigo-100/80 bg-indigo-50/70 px-4 py-2 text-xs text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Ação rápida:</span>
            <span>Cadastre um novo negócio no pipeline</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/negocios?novo=1');
            }}
            className="flex cursor-pointer items-center gap-1 rounded border border-indigo-200 bg-white px-2 py-0.5 font-semibold text-indigo-700 shadow-2xs hover:text-indigo-900 dark:border-indigo-700 dark:bg-slate-800 dark:text-indigo-300 dark:hover:text-indigo-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar negócio
          </button>
        </div>

        <div className="custom-scrollbar max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              Carregando resultados…
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-500">{error}</div>
          ) : (
            <>
              {filteredNegocios.length > 0 && (
                <section className="py-2">
                  <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Negócios no Pipeline ({filteredNegocios.length})
                  </div>
                  {filteredNegocios.map((negocio) => {
                    const currentIndex = resultIndex++;
                    return (
                      <button
                        key={negocio.publicId}
                        type="button"
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        onClick={() => openResult({ type: 'negocio', item: negocio })}
                        className={`group flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          activeIndex === currentIndex
                            ? 'bg-slate-100 dark:bg-slate-800/80'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-xs font-bold text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                            title={`Responsável: ${negocio.nomeOperador?.trim() || 'Sem responsável'}`}
                          >
                            {getNameInitial(negocio.nomeOperador)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                                {negocio.nomeCliente}
                              </span>
                              {negocio.referencia && (
                                <span className="rounded bg-slate-100 px-1.5 text-[11px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Ref #{negocio.referencia}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-slate-500 dark:text-slate-400">
                              <span>{negocio.telefonePrincipal || 'Telefone não informado'}</span>
                              {negocio.documento && <span>• {negocio.documento}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-3">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(negocio.valor)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
                        </div>
                      </button>
                    );
                  })}
                </section>
              )}

              {filteredContatos.length > 0 && (
                <section className="border-t border-slate-100 py-2 dark:border-slate-800">
                  <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Contatos ({filteredContatos.length})
                  </div>
                  {filteredContatos.map((contato) => {
                    const currentIndex = resultIndex++;
                    return (
                      <button
                        key={contato.clientePublicId}
                        type="button"
                        onMouseEnter={() => setActiveIndex(currentIndex)}
                        onClick={() => openResult({ type: 'contato', item: contato })}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          activeIndex === currentIndex
                            ? 'bg-slate-100 dark:bg-slate-800/80'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {contato.nome}
                            </span>
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              Doc: {contato.documento || 'Não informado'} • {contato.telefonePrincipal || 'Telefone não informado'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="ml-3 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                      </button>
                    );
                  })}
                </section>
              )}

              {results.length === 0 && (
                <div className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <Search className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium">Nenhum registro encontrado para “{query}”</p>
                  <p className="mt-1 text-xs">Tente pesquisar por nome, documento, referência ou telefone.</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">↑</kbd> <kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">↓</kbd> para navegar</span>
            <span><kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Enter</kbd> para abrir</span>
            <span><kbd className="rounded border border-slate-200 bg-white px-1 font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Esc</kbd> para fechar</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
