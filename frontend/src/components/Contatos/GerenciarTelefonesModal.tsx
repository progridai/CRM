import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Phone,
  Plus,
  Smartphone,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  atualizarTelefones,
  type ContatoDto,
  type TelefoneInput,
  type TipoTelefone,
} from '../../services/contatosService';

interface GerenciarTelefonesModalProps {
  contato: ContatoDto | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

interface TelefoneDraft extends TelefoneInput {
  key: string;
}

function formatarEntrada(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 13);
  if (digitos.length <= 8) {
    return digitos.length > 4 ? `${digitos.slice(0, 4)}-${digitos.slice(4)}` : digitos;
  }
  if (digitos.length === 9) return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}${digitos.length > 6 ? `-${digitos.slice(6)}` : ''}`;
  }
  if (digitos.length <= 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}${digitos.length > 7 ? `-${digitos.slice(7)}` : ''}`;
  }
  return valor;
}

function numerosIguais(telefones: TelefoneDraft[]): boolean {
  const numeros = telefones.map((telefone) => telefone.valor.replace(/\D/g, ''));
  return new Set(numeros).size !== numeros.length;
}

export const GerenciarTelefonesModal: React.FC<GerenciarTelefonesModalProps> = ({
  contato,
  onClose,
  onSaved,
}) => {
  const sequence = useRef(0);
  const [telefones, setTelefones] = useState<TelefoneDraft[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!contato) return;
    setTelefones(contato.telefones.map((telefone) => ({
      ...telefone,
      key: `saved-${telefone.id}`,
    })));
    setErro(null);
  }, [contato]);

  useEffect(() => {
    if (!contato) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !salvando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contato, onClose, salvando]);

  const validacao = useMemo(() => {
    if (telefones.some((telefone) => telefone.valor.replace(/\D/g, '').length < 8))
      return 'Preencha todos os telefones com pelo menos 8 dígitos.';
    if (numerosIguais(telefones))
      return 'O mesmo telefone foi informado mais de uma vez.';
    return null;
  }, [telefones]);

  if (!contato) return null;

  const adicionar = () => {
    const primeiro = telefones.length === 0;
    setTelefones((atuais) => [
      ...atuais,
      {
        key: `new-${sequence.current++}`,
        tipo: 'CELULAR',
        valor: '',
        principal: primeiro,
      },
    ]);
    setErro(null);
  };

  const alterar = (key: string, campo: 'tipo' | 'valor', valor: string) => {
    setTelefones((atuais) => atuais.map((telefone) =>
      telefone.key === key
        ? { ...telefone, [campo]: campo === 'tipo' ? valor as TipoTelefone : formatarEntrada(valor) }
        : telefone));
    setErro(null);
  };

  const definirPrincipal = (key: string) => {
    setTelefones((atuais) => atuais.map((telefone) => ({
      ...telefone,
      principal: telefone.key === key,
    })));
    setErro(null);
  };

  const remover = (key: string) => {
    setTelefones((atuais) => {
      const removido = atuais.find((telefone) => telefone.key === key);
      const restantes = atuais.filter((telefone) => telefone.key !== key);
      if (removido?.principal && restantes.length > 0)
        restantes[0] = { ...restantes[0], principal: true };
      return restantes;
    });
    setErro(null);
  };

  const salvar = async () => {
    if (validacao) {
      setErro(validacao);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await atualizarTelefones(
        contato.pessoaId,
        telefones.map(({ id, tipo, valor, principal }) => ({ id, tipo, valor, principal })),
      );
      await onSaved();
      onClose();
    } catch (error: any) {
      setErro(error?.response?.data?.message ?? 'Não foi possível salvar os telefones.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar editor de telefones"
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => !salvando && onClose()}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-gerenciar-telefones"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="flex gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <h2 id="titulo-gerenciar-telefones" className="text-lg font-bold text-slate-900 dark:text-white">
                Gerenciar telefones
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{contato.nome}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {telefones.length === 1 ? '1 telefone cadastrado' : `${telefones.length} telefones cadastrados`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                A estrela define o número usado como principal e no botão do WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={adicionar}
              disabled={salvando || telefones.length >= 10}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <Plus className="h-4 w-4" />
              Adicionar telefone
            </button>
          </div>

          {telefones.length === 0 ? (
            <button
              type="button"
              onClick={adicionar}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
            >
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Phone className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nenhum telefone cadastrado</span>
              <span className="mt-1 text-xs text-slate-500">Clique para adicionar o primeiro número.</span>
            </button>
          ) : (
            <div className="space-y-3">
              {telefones.map((telefone, index) => (
                <div
                  key={telefone.key}
                  className={`rounded-xl border p-4 transition-colors ${
                    telefone.principal
                      ? 'border-indigo-300 bg-indigo-50/60 dark:border-indigo-700 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        telefone.tipo === 'CELULAR'
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300'
                      }`}>
                        {telefone.tipo === 'CELULAR' ? <Smartphone className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Telefone {index + 1}
                      </span>
                      {telefone.principal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          <Star className="h-3 w-3 fill-current" /> Principal
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remover(telefone.key)}
                      disabled={salvando}
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      aria-label={`Remover telefone ${index + 1}`}
                      title="Remover telefone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[140px_1fr_auto]">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">Tipo</span>
                      <select
                        value={telefone.tipo}
                        onChange={(event) => alterar(telefone.key, 'tipo', event.target.value)}
                        disabled={salvando}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="CELULAR">Celular</option>
                        <option value="TELEFONE">Telefone</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">Número</span>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={telefone.valor}
                        onChange={(event) => alterar(telefone.key, 'valor', event.target.value)}
                        disabled={salvando}
                        placeholder="(00) 00000-0000"
                        autoFocus={!telefone.id}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => definirPrincipal(telefone.key)}
                      disabled={salvando || telefone.principal}
                      className={`mt-auto inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors ${
                        telefone.principal
                          ? 'cursor-default border-indigo-200 bg-indigo-100 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      }`}
                    >
                      {telefone.principal ? <Check className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      {telefone.principal ? 'Principal' : 'Tornar principal'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(erro || validacao) && (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {erro || validacao}
            </p>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
            Os telefones são compartilhados com o WebAPolice. Números removidos deixam de aparecer, mas permanecem no histórico da base.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200/70 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || Boolean(validacao)}
            className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </footer>
      </section>
    </div>
  );
};
