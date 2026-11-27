import type { EtapaDto, NegocioDto } from '../../services/negociosService';
import { formatCurrency } from '../../utils';
import { formatarPeriodo, getCompetenceValue } from './negociosIndicators';

interface NegociosDoClienteProps {
  meses: string[];
  mes: string | undefined;
  onMesChange: (mes: string) => void;
  negocios: NegocioDto[];
  etapasPorCodigo: ReadonlyMap<string, EtapaDto>;
  quantidadeEmAberto: number;
  totalEmAberto: number;
}

export function NegociosDoCliente({
  meses, mes, onMesChange, negocios, etapasPorCodigo, quantidadeEmAberto, totalEmAberto,
}: NegociosDoClienteProps) {
  if (!mes) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      Este negócio ainda não tem mês de cobrança vinculado.
    </p>;
  }

  const negociosDoMes = [...negocios].sort((a, b) =>
    a.competenciaAno - b.competenciaAno || a.competenciaMes - b.competenciaMes);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Negócios do cliente</h3>
        {meses.length > 1 ? (
          <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            Mês de cobrança
            <select value={mes} onChange={event => onMesChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {meses.map(periodo => <option key={periodo} value={periodo}>{formatarPeriodo(periodo)}</option>)}
            </select>
          </label>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Mês de cobrança · {formatarPeriodo(mes)}</span>
        )}
      </div>

      {negociosDoMes.length > 0 ? (
        <ul className="space-y-2">
          {negociosDoMes.map(negocio => (
            <li key={negocio.publicId} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Competência {formatarPeriodo(getCompetenceValue(negocio))}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {etapasPorCodigo.get(negocio.etapaCodigo)?.nome ?? 'Etapa não disponível'}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(negocio.valor)}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div className="min-w-0">
                  <dt className="text-slate-500 dark:text-slate-400">Referência</dt>
                  <dd className="break-words font-medium text-slate-700 dark:text-slate-200">{negocio.referencia || '—'}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-slate-500 dark:text-slate-400">Responsável</dt>
                  <dd className="break-words font-medium text-slate-700 dark:text-slate-200">{negocio.nomeOperador || '—'}</dd>
                </div>
                {negocio.dataVencimento && (
                  <div className="min-w-0">
                    <dt className="text-slate-500 dark:text-slate-400">Vencimento</dt>
                    <dd className="font-medium text-slate-700 dark:text-slate-200">
                      {new Date(negocio.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </dd>
                  </div>
                )}
                {negocio.origem && (
                  <div className="col-span-2 min-w-0">
                    <dt className="text-slate-500 dark:text-slate-400">Origem</dt>
                    <dd className="break-words font-medium text-slate-700 dark:text-slate-200">{negocio.origem}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum negócio vinculado a esse mês.</p>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/40" aria-live="polite">
        <div>
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">Total em aberto</p>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
            {quantidadeEmAberto} de {negociosDoMes.length} {negociosDoMes.length === 1 ? 'negócio' : 'negócios'}
          </p>
        </div>
        <strong className="text-base tabular-nums text-indigo-900 dark:text-indigo-200">{formatCurrency(totalEmAberto)}</strong>
      </div>
    </section>
  );
}
