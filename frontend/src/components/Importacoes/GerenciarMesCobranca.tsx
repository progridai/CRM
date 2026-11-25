import { useEffect, useState } from 'react';
import { AlertCircle, Database, Loader2 } from 'lucide-react';
import { consultarResumoMesCobranca, type MesCobrancaResumoDto } from '../../services/importacoesService';
import { formatCurrency } from '../../utils';

export function GerenciarMesCobranca() {
  const [periodo, setPeriodo] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  const [resumo, setResumo] = useState<MesCobrancaResumoDto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ano, mes] = periodo.split('-').map(Number);
  const periodoValido = ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12;

  useEffect(() => {
    if (!periodoValido) return;

    let ativo = true;
    consultarResumoMesCobranca(ano, mes)
      .then((data) => { if (ativo) setResumo(data); })
      .catch(() => { if (ativo) setErro('Não foi possível consultar o mês de cobrança.'); });
    return () => { ativo = false; };
  }, [ano, mes, periodoValido]);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Database className="h-4 w-4" />
          </span>
          <label htmlFor="resumo-mes-cobranca" className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Mês de Cobrança</label>
        </div>
        <input
          id="resumo-mes-cobranca"
          type="month"
          min="2000-01"
          max="2100-12"
          value={periodo}
          onChange={(event) => {
            setResumo(null);
            setErro(null);
            setPeriodo(event.target.value);
          }}
          className="mt-5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Para corrigir o mês, volte à aba Importar e selecione a operação desejada.
        </p>
      </section>

      <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Resumo do mês</h2>
        {resumo ? (
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Negócios vinculados</dt>
              <dd className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">{resumo.quantidade}</dd>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Valor dos negócios</dt>
              <dd className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(resumo.valorTotal)}</dd>
            </div>
          </dl>
        ) : erro ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300">
            <AlertCircle className="h-4 w-4" /> {erro}
          </p>
        ) : periodoValido ? (
          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Consultando mês de cobrança…
          </p>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Selecione um mês de cobrança válido.</p>
        )}
      </section>
    </div>
  );
}
