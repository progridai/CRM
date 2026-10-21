import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Phone,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { buscarContatos, type ContatoDto } from '../../services/contatosService';

interface ContatoAutocompleteProps {
  value: ContatoDto | null;
  onChange: (contato: ContatoDto | null) => void;
  hasError?: boolean;
}

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;
const RESULT_LIMIT = 8;

function iniciais(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('') || '?';
}

function documentoFormatado(documento: string): string {
  const digitos = documento.replace(/\D/g, '');
  if (digitos.length === 11)
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  if (digitos.length === 14)
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
  return documento;
}

export const ContatoAutocomplete: React.FC<ContatoAutocompleteProps> = ({
  value,
  onChange,
  hasError = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContatoDto[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [requestError, setRequestError] = useState(false);

  useEffect(() => {
    if (value) setQuery(value.nome);
    else setQuery('');
  }, [value]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    const termo = query.trim();
    if (!open || termo.length < MIN_SEARCH_LENGTH || (value && termo === value.nome)) {
      setResults([]);
      setLoading(false);
      setRequestError(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setRequestError(false);
      try {
        const response = await buscarContatos(termo, RESULT_LIMIT, controller.signal);
        setResults(response);
        setHighlightedIndex(0);
      } catch (error: any) {
        if (error?.code !== 'ERR_CANCELED') {
          setResults([]);
          setRequestError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query, value]);

  const selecionar = (contato: ContatoDto) => {
    onChange(contato);
    setQuery(contato.nome);
    setOpen(false);
    setResults([]);
  };

  const limpar = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    if (value) onChange(null);
    setOpen(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && results[highlightedIndex]) {
      event.preventDefault();
      selecionar(results[highlightedIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const termoCurto = query.trim().length < MIN_SEARCH_LENGTH;

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex min-h-11 items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-2 ${
        hasError
          ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-100'
          : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-indigo-100'
      }`}>
        {value ? (
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
              {iniciais(value.nome)}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                limpar();
              }}
            >
              <span className="block truncate text-sm font-semibold text-slate-800">{value.nome}</span>
              <span className="mt-0.5 flex items-center gap-2 truncate text-[10px] text-slate-500">
                <span>{documentoFormatado(value.documento)}</span>
                {value.telefonePrincipal && <span>• {value.telefonePrincipal}</span>}
              </span>
            </button>
            <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            <button
              type="button"
              onClick={limpar}
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              aria-label="Remover contato selecionado"
              title="Trocar contato"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              value={query}
              onChange={handleInput}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Digite nome, CPF/CNPJ ou telefone"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
            />
            {loading ? (
              <Loader2 className="mr-3 h-4 w-4 animate-spin text-indigo-500" />
            ) : (
              <ChevronDown className={`mr-3 h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </>
        )}
      </div>

      {open && !value && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          {termoCurto ? (
            <div className="flex flex-col items-center px-4 py-6 text-center">
              <Search className="mb-2 h-5 w-5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Encontre o contato</p>
              <p className="mt-1 text-[11px] text-slate-400">Digite pelo menos 2 caracteres.</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              Buscando contatos…
            </div>
          ) : requestError ? (
            <div className="px-4 py-5 text-center text-xs font-medium text-rose-500">
              Não foi possível buscar os contatos. Tente novamente.
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <UserRound className="mx-auto mb-2 h-5 w-5 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Nenhum contato encontrado</p>
              <p className="mt-1 text-[11px] text-slate-400">Confira o nome, documento ou telefone informado.</p>
            </div>
          ) : (
            <ul role="listbox" className="max-h-72 overflow-y-auto py-1.5">
              {results.map((contato, index) => (
                <li key={contato.clientePublicId} role="option" aria-selected={index === highlightedIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selecionar(contato)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      index === highlightedIndex ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                      {iniciais(contato.nome)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{contato.nome}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {documentoFormatado(contato.documento)}
                        </span>
                        {contato.telefonePrincipal && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {contato.telefonePrincipal}
                          </span>
                        )}
                      </span>
                    </span>
                    {index === highlightedIndex && <Check className="h-4 w-4 shrink-0 text-indigo-600" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
