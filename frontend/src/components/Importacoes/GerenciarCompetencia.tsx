import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import {
  consultarResumoCompetencia,
  excluirCompetencia,
  type CompetenciaResumoDto,
} from '../../services/importacoesService';
import { formatCurrency } from '../../utils';

interface GerenciarCompetenciaProps {
  onOperationComplete?: () => void;
}

const DATA_ATUAL = new Date();
const MES_ATUAL = DATA_ATUAL.getMonth() + 1;
const ANO_ATUAL = DATA_ATUAL.getFullYear();
const ANOS_DISPONIVEIS = Array.from({ length: 7 }, (_, index) => ANO_ATUAL - 3 + index);
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message ?? fallback;

export const GerenciarCompetencia: React.FC<GerenciarCompetenciaProps> = ({ onOperationComplete }) => {
  const [competenciaMes, setCompetenciaMes] = useState(MES_ATUAL);
  const [competenciaAno, setCompetenciaAno] = useState(ANO_ATUAL);
  const [resumo, setResumo] = useState<CompetenciaResumoDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    consultarResumoCompetencia(competenciaAno, competenciaMes)
      .then((data) => {
        if (active) setResumo(data);
      })
      .catch((requestError) => {
        if (active) {
          setResumo(null);
          setError(getErrorMessage(requestError, 'Não foi possível consultar esta competência.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [competenciaAno, competenciaMes, reloadKey]);

  const closeConfirmation = () => {
    if (deleting) return;
    setConfirmOpen(false);
    setAcknowledged(false);
  };

  const handleDelete = async () => {
    if (!acknowledged || !resumo || resumo.quantidade === 0 || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      const result = await excluirCompetencia(competenciaAno, competenciaMes);
      setResumo({
        competenciaAno,
        competenciaMes,
        quantidade: 0,
        valorTotal: 0,
      });
      setConfirmOpen(false);
      setAcknowledged(false);
      setSuccess(`${result.quantidadeExcluida} negócio(s) excluído(s) de ${MESES[competenciaMes - 1]}/${competenciaAno}.`);
      onOperationComplete?.();
    } catch (requestError: any) {
      setError(getErrorMessage(requestError, 'Não foi possível excluir os negócios desta competência.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Database className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Selecionar competência</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Consulte os dados antes de realizar a exclusão</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[1fr_112px] gap-3">
            <select value={competenciaMes} onChange={(event) => setCompetenciaMes(Number(event.target.value))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              {MESES.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
            <select value={competenciaAno} onChange={(event) => setCompetenciaAno(Number(event.target.value))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
              {ANOS_DISPONIVEIS.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] leading-4 text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
            Somente negócios ativos serão removidos do Kanban. Atividades e históricos relacionados permanecem preservados.
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" /> Consultando competência…
            </div>
          ) : error && !resumo ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
              <AlertCircle className="h-7 w-7 text-rose-500" />
              <p className="text-xs text-rose-600 dark:text-rose-300">{error}</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Tentar novamente</button>
            </div>
          ) : resumo ? (
            <div className="flex min-h-52 flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resumo da competência</span>
                <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">{MESES[competenciaMes - 1]} / {competenciaAno}</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <span className="text-[10px] font-semibold text-slate-400">Negócios encontrados</span>
                    <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">{resumo.quantidade}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                    <span className="text-[10px] font-semibold text-slate-400">Valor total</span>
                    <p className="mt-1 font-display text-lg font-extrabold text-slate-900 dark:text-slate-100">{formatCurrency(resumo.valorTotal)}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAcknowledged(false);
                  setConfirmOpen(true);
                }}
                disabled={resumo.quantidade === 0}
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50 dark:disabled:border-slate-800 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              >
                <Trash2 className="h-4 w-4" />
                {resumo.quantidade === 0 ? 'Nenhum negócio para excluir' : 'Excluir negócios desta competência'}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {success && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {success}
        </div>
      )}
      {error && resumo && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {confirmOpen && resumo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={closeConfirmation}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-exclusao-competencia" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="titulo-exclusao-competencia" className="font-display text-base font-bold text-slate-900 dark:text-slate-100">Excluir todos os negócios de {MESES[competenciaMes - 1]}/{competenciaAno}?</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{resumo.quantidade} {resumo.quantidade === 1 ? 'negócio será excluído' : 'negócios serão excluídos'}.</p>
                </div>
              </div>
              <button type="button" onClick={closeConfirmation} disabled={deleting} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar confirmação"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50/70 p-3 dark:border-rose-900 dark:bg-rose-950/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-700 dark:text-rose-300">Valor total</span>
                <strong className="text-rose-800 dark:text-rose-200">{formatCurrency(resumo.valorTotal)}</strong>
              </div>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} disabled={deleting} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
              <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">Estou ciente de que todos os negócios desta competência serão excluídos.</span>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeConfirmation} disabled={deleting} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" onClick={() => void handleDelete()} disabled={!acknowledged || deleting} className="inline-flex h-9 items-center gap-2 rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleting ? 'Excluindo…' : `Excluir ${resumo.quantidade} negócios`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
