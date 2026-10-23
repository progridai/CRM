import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, History, Loader2, RefreshCw, Trash2, XCircle } from 'lucide-react';
import {
  listarHistoricoImportacoes,
  type ImportacaoOperacaoDto,
} from '../../services/importacoesService';

interface HistoricoImportacoesProps {
  refreshKey?: number;
}

const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ?? 'Não foi possível carregar o histórico de operações.';

export const HistoricoImportacoes: React.FC<HistoricoImportacoesProps> = ({ refreshKey = 0 }) => {
  const [operacoes, setOperacoes] = useState<ImportacaoOperacaoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    listarHistoricoImportacoes(100)
      .then((data) => {
        if (active) setOperacoes(data);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey, reloadKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <History className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Histórico de operações</h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Importações e exclusões mais recentes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
          Carregando histórico…
        </div>
      ) : error ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="h-7 w-7 text-rose-500" />
          <p className="max-w-md text-xs text-rose-600 dark:text-rose-300">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Tentar novamente</button>
        </div>
      ) : operacoes.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-6 text-center">
          <History className="h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhuma operação registrada</p>
          <p className="text-xs text-slate-400">As próximas importações e exclusões aparecerão aqui.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-3">Data/hora</th>
                <th className="px-4 py-3">Operação</th>
                <th className="px-4 py-3">Competência</th>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Quantidade</th>
                <th className="px-4 py-3">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {operacoes.map((operacao) => {
                const isImport = operacao.tipoOperacao === 'IMPORTACAO';
                const success = operacao.resultado === 'SUCESSO';
                const quantity = isImport ? operacao.quantidadeInseridos : operacao.quantidadeExcluidos;

                return (
                  <tr key={operacao.publicId} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/35">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-600 dark:text-slate-300">{formatDateTime(operacao.dataHora)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${isImport ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                        {isImport ? <FileUp className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                        {isImport ? 'Importação' : 'Exclusão'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      {MESES_ABREV[operacao.competenciaMes - 1]}/{operacao.competenciaAno}
                    </td>
                    <td className="max-w-44 px-4 py-3 text-slate-500 dark:text-slate-400">
                      <span className="block truncate" title={operacao.nomeArquivo}>{operacao.nomeArquivo || '—'}</span>
                    </td>
                    <td className="max-w-40 px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="block truncate" title={operacao.usuarioNome}>{operacao.usuarioNome || 'Sistema'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-slate-800 dark:text-slate-100">
                        {quantity} {quantity === 1 ? 'negócio' : 'negócios'}
                      </span>
                      {isImport && operacao.quantidadeExcluidos > 0 && (
                        <span className="mt-0.5 block text-[10px] text-slate-400">{operacao.quantidadeExcluidos} anterior(es) removido(s)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${success ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`} title={operacao.mensagem}>
                        {success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {success ? 'Sucesso' : 'Erro'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
