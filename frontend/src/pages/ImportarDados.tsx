import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Info,
  Loader2,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import {
  importarNegocios,
  type ImportacaoNegociosResultadoDto,
  type ModoImportacao,
  type StatusLogImportacao,
} from '../services/importacoesService';
import { formatCurrency } from '../utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DATA_ATUAL = new Date();
const MES_ATUAL = DATA_ATUAL.getMonth() + 1;
const ANO_ATUAL = DATA_ATUAL.getFullYear();
const ANOS_DISPONIVEIS = Array.from({ length: 7 }, (_, index) => ANO_ATUAL - 3 + index);

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MAPEAMENTOS = [
  ['Estipulante', 'Origem'],
  ['Matrícula', 'Referência'],
  ['CPF', 'Contato'],
  ['Situação', 'Observações iniciais'],
  ['Prêmio', 'Valor do débito'],
  ['Cobrador', 'Responsável'],
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export const ImportarDadosPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [competenciaMes, setCompetenciaMes] = useState(MES_ATUAL);
  const [competenciaAno, setCompetenciaAno] = useState(ANO_ATUAL);
  const [modo, setModo] = useState<ModoImportacao>('adicionar');
  const [arrastando, setArrastando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportacaoNegociosResultadoDto | null>(null);
  const [confirmarSubstituicao, setConfirmarSubstituicao] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusLogImportacao>('todos');
  const [buscaLog, setBuscaLog] = useState('');

  const logsFiltrados = useMemo(() => {
    if (!resultado) return [];
    const termo = buscaLog.trim().toLocaleLowerCase('pt-BR');
    return resultado.logs.filter((log) => {
      if (filtroStatus !== 'todos' && log.status !== filtroStatus) return false;
      if (!termo) return true;
      return [log.nome, log.cpf, log.referencia, log.mensagem, log.aba, String(log.linha)]
        .filter(Boolean)
        .some((valor) => String(valor).toLocaleLowerCase('pt-BR').includes(termo));
    });
  }, [buscaLog, filtroStatus, resultado]);

  const selecionarArquivo = (file: File | undefined) => {
    setErro(null);
    setResultado(null);
    if (!file) return;

    if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.xlsx')) {
      setArquivo(null);
      setErro('Formato inválido. Selecione uma planilha com extensão .xlsx.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setArquivo(null);
      setErro('A planilha deve ter no máximo 10 MB.');
      return;
    }

    setArquivo(file);
  };

  const executarImportacao = async () => {
    if (!arquivo) {
      setErro('Selecione a planilha que deseja importar.');
      return;
    }

    setImportando(true);
    setProgresso(4);
    setErro(null);
    setResultado(null);
    setConfirmarSubstituicao(false);

    try {
      const response = await importarNegocios({
        arquivo,
        competenciaMes,
        competenciaAno,
        modo,
        onProgress: setProgresso,
      });
      setResultado(response);
      setFiltroStatus(response.naoImportados > 0 ? 'nao_importado' : 'todos');
      setBuscaLog('');
    } catch (requestError: any) {
      setErro(
        requestError?.response?.data?.message
          ?? 'Não foi possível concluir a importação. Verifique a planilha e tente novamente.',
      );
    } finally {
      setImportando(false);
      setProgresso(0);
    }
  };

  const solicitarImportacao = () => {
    if (!arquivo) {
      setErro('Selecione a planilha que deseja importar.');
      return;
    }
    if (modo === 'substituir') {
      setConfirmarSubstituicao(true);
      return;
    }
    void executarImportacao();
  };

  const baixarLog = () => {
    if (!resultado) return;
    const header = ['Status', 'Aba', 'Linha', 'Nome', 'CPF', 'Referência', 'Valor', 'Mensagem'];
    const rows = resultado.logs.map((log) => [
      log.status === 'sucesso' ? 'Importado' : 'Não importado',
      log.aba,
      log.linha,
      log.nome ?? '',
      log.cpf ?? '',
      log.referencia ?? '',
      log.valor?.toFixed(2).replace('.', ',') ?? '',
      log.mensagem,
    ]);
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-importacao-${resultado.competenciaAno}-${String(resultado.competenciaMes).padStart(2, '0')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const iniciarNovaImportacao = () => {
    setArquivo(null);
    setResultado(null);
    setErro(null);
    setModo('adicionar');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
            <UploadCloud className="h-3.5 w-3.5" />
            Entrada de dados
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Importação de negócios
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Importe a inadimplência do Excel para a etapa Nova Posição. Contatos e responsáveis são validados antes de qualquer gravação.
          </p>
        </div>
        {resultado && (
          <button
            type="button"
            onClick={iniciarNovaImportacao}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Nova importação
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/40">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Não foi possível importar</p>
            <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">{erro}</p>
          </div>
          <button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso">
            <X className="h-4 w-4 text-rose-500" />
          </button>
        </div>
      )}

      {!resultado && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-display text-sm font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">1</span>
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Selecione a planilha</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Arquivo Excel .xlsx de até 10 MB</p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <input
                  ref={fileInputRef}
                  id="arquivo-importacao"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(event) => selecionarArquivo(event.target.files?.[0])}
                />

                {!arquivo ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={(event) => { event.preventDefault(); setArrastando(true); }}
                    onDragOver={(event) => { event.preventDefault(); setArrastando(true); }}
                    onDragLeave={(event) => { event.preventDefault(); setArrastando(false); }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setArrastando(false);
                      selecionarArquivo(event.dataTransfer.files?.[0]);
                    }}
                    className={`group flex min-h-64 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all ${
                      arrastando
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40'
                        : 'border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-950/30 dark:hover:border-indigo-700'
                    }`}
                  >
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 transition-transform group-hover:-translate-y-0.5 dark:bg-slate-900 dark:text-indigo-400 dark:ring-slate-700">
                      <UploadCloud className="h-7 w-7" strokeWidth={1.8} />
                    </span>
                    <span className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">
                      Arraste a planilha para cá
                    </span>
                    <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      ou clique para procurar no computador
                    </span>
                    <span className="mt-4 rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                      Somente XLSX
                    </span>
                  </button>
                ) : (
                  <div className="flex min-h-64 flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200 dark:bg-slate-900 dark:text-emerald-400 dark:ring-emerald-800">
                        <FileSpreadsheet className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <FileCheck2 className="h-3.5 w-3.5" /> Arquivo pronto
                        </div>
                        <p className="mt-1.5 truncate font-display text-sm font-bold text-slate-900 dark:text-slate-100" title={arquivo.name}>
                          {arquivo.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatFileSize(arquivo.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setArquivo(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-600 dark:hover:bg-slate-900"
                        aria-label="Remover arquivo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-6 rounded-xl border border-emerald-200/80 bg-white/80 p-3.5 dark:border-emerald-900 dark:bg-slate-900/70">
                      <div className="flex items-start gap-2.5">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <p className="text-[11px] leading-4 text-slate-600 dark:text-slate-300">
                          Abas resumidas são ignoradas. O sistema importa somente abas que contenham todas as colunas obrigatórias.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 self-start text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                    >
                      Escolher outro arquivo
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 font-display text-sm font-extrabold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">2</span>
                  <div>
                    <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Configure a importação</h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Defina a competência e como tratar os dados existentes</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5">
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Competência dos negócios
                  </label>
                  <div className="grid grid-cols-[1fr_112px] gap-3">
                    <select
                      id="competencia-mes"
                      value={competenciaMes}
                      onChange={(event) => setCompetenciaMes(Number(event.target.value))}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {MESES.map((mes, index) => <option key={mes} value={index + 1}>{mes}</option>)}
                    </select>
                    <select
                      id="competencia-ano"
                      value={competenciaAno}
                      onChange={(event) => setCompetenciaAno(Number(event.target.value))}
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {ANOS_DISPONIVEIS.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
                    </select>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">A competência selecionada prevalece sobre os campos de mês e ano da planilha.</p>
                </div>

                <div>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tratamento da competência
                  </span>
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setModo('adicionar')}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                        modo === 'adicionar'
                          ? 'border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-500/10 dark:border-indigo-600 dark:bg-indigo-950/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${modo === 'adicionar' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        <PlusCircle className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Adicionar aos dados existentes</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">Mantém todos os negócios já cadastrados nessa competência.</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModo('substituir')}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                        modo === 'substituir'
                          ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-500/10 dark:border-amber-600 dark:bg-amber-950/30'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${modo === 'substituir' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        <RefreshCw className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Substituir toda a competência</span>
                        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">Remove os negócios ativos do período antes de importar as linhas válidas.</span>
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={solicitarImportacao}
                  disabled={!arquivo || importando}
                  className="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                >
                  {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {importando ? 'Validando e importando…' : 'Importar planilha'}
                  {!importando && <ArrowRight className="h-4 w-4" />}
                </button>

                {importando && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span>{progresso < 100 ? 'Enviando arquivo' : 'Processando linhas e vínculos'}</span>
                      <span>{progresso}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.max(4, progresso)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="font-display text-sm font-bold text-slate-800 dark:text-slate-100">Mapeamento do Excel</h2>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {MAPEAMENTOS.map(([origem, destino]) => (
                <div key={origem} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[11px] dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{origem}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
                  <span className="text-slate-500 dark:text-slate-400">{destino}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {resultado && (
        <>
          <section className={`overflow-hidden rounded-2xl border shadow-2xs ${resultado.naoImportados === 0 ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20'}`}>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${resultado.naoImportados === 0 ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                  {resultado.naoImportados === 0 ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                    {resultado.naoImportados === 0 ? 'Importação concluída' : 'Importação concluída com pendências'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {MESES[resultado.competenciaMes - 1]} de {resultado.competenciaAno} · {resultado.abasLidas.length} {resultado.abasLidas.length === 1 ? 'aba reconhecida' : 'abas reconhecidas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={baixarLog}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar log em CSV
              </button>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Linhas lidas</span>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">{resultado.totalLinhas}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400" title={resultado.arquivo}>{resultado.arquivo}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs dark:border-emerald-900 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Importados</span>
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{resultado.importados}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{formatCurrency(resultado.valorImportado)}</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-2xs dark:border-rose-900 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Não importados</span>
              <p className="mt-1 font-display text-2xl font-extrabold text-rose-600 dark:text-rose-400">{resultado.naoImportados}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Confira os motivos no log</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Substituídos</span>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-100">{resultado.substituidos}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Negócios anteriores desativados</p>
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Log da importação</h2>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{logsFiltrados.length} de {resultado.logs.length} ocorrências exibidas</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950/40">
                  {([
                    ['todos', 'Todos'],
                    ['sucesso', 'Importados'],
                    ['nao_importado', 'Pendências'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFiltroStatus(value)}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${filtroStatus === value ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="search"
                    value={buscaLog}
                    onChange={(event) => setBuscaLog(event.target.value)}
                    placeholder="Buscar no log…"
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto custom-scrollbar">
              <table className="w-full min-w-[850px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-800/95 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Planilha</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Referência</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logsFiltrados.map((log) => (
                    <tr key={`${log.aba}-${log.linha}-${log.ordem}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        {log.status === 'sucesso' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Importado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                            <XCircle className="h-3 w-3" /> Não importado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <span className="block max-w-36 truncate font-medium text-slate-700 dark:text-slate-200" title={log.aba}>{log.aba}</span>
                        <span className="text-[10px]">Linha {log.linha}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-48 truncate font-semibold text-slate-800 dark:text-slate-100" title={log.nome}>{log.nome || '—'}</span>
                        <span className="text-[10px] text-slate-400">{log.cpf || 'CPF indisponível'}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{log.referencia || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">{log.valor != null ? formatCurrency(log.valor) : '—'}</td>
                      <td className={`max-w-sm px-4 py-3 leading-4 ${log.status === 'sucesso' ? 'text-slate-500 dark:text-slate-400' : 'font-medium text-rose-700 dark:text-rose-300'}`}>{log.mensagem}</td>
                    </tr>
                  ))}
                  {logsFiltrados.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">Nenhuma ocorrência encontrada para o filtro atual.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {confirmarSubstituicao && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={() => setConfirmarSubstituicao(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacao-substituicao" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div>
                <h2 id="titulo-confirmacao-substituicao" className="font-display text-base font-bold text-slate-900 dark:text-slate-100">Substituir a competência?</h2>
                <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  Os negócios ativos de <strong>{MESES[competenciaMes - 1]} de {competenciaAno}</strong> serão desativados e somente as linhas válidas desta planilha serão recriadas.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Linhas sem contato ou responsável cadastrado aparecerão no log e não entrarão no Kanban.
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmarSubstituicao(false)} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
              <button type="button" onClick={() => void executarImportacao()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-white hover:bg-amber-600">
                <RefreshCw className="h-3.5 w-3.5" /> Substituir e importar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
