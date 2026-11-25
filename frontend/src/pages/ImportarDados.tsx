import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Database, Download, FileSpreadsheet, History, Loader2, UploadCloud } from 'lucide-react';
import { GerenciarMesCobranca } from '../components/Importacoes/GerenciarMesCobranca';
import { HistoricoImportacoes } from '../components/Importacoes/HistoricoImportacoes';
import {
  analisarPlanilhaNegocios, importarNegocios, type ImportacaoNegociosResultadoDto,
  type ImportacaoPlanilhaAnaliseDto, type ImportacaoNegociosLogDto, type ModoImportacao,
} from '../services/importacoesService';
import { formatCurrency } from '../utils';

const etapas = ['Configuração', 'Enviar Excel', 'Analisar', 'Distribuição', 'Confirmar'];
const modos = {
  adicionar: { nome: 'Adicionar', descricao: 'Acrescenta a carga aos negócios vinculados ao mês.' },
  substituir: { nome: 'Substituir', descricao: 'Atualiza a composição do mês e encerra os vínculos de parcelas ausentes no arquivo.' },
  limpar: { nome: 'Limpar e importar novamente', descricao: 'Encerra todos os vínculos anteriores do mês e registra os da nova carga.' },
} satisfies Record<ModoImportacao, { nome: string; descricao: string }>;

const rotulos = { sucesso: 'Novo', vinculado: 'Existente', nao_importado: 'Rejeitado' };
const painel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900';
const campo = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950';
const botao = 'inline-flex min-h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';
const principal = 'inline-flex min-h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';

function baixarLog(logs: ImportacaoNegociosLogDto[]) {
  const celula = (valor: unknown) => {
    const texto = String(valor ?? '');
    const seguro = /^[\s]*[=+\-@]/.test(texto) ? "'" + texto : texto;
    return '"' + seguro.replaceAll('"', '""') + '"';
  };
  const linhas = [
    ['Status', 'Aba', 'Linha', 'Cliente', 'CPF', 'Referência', 'Valor', 'Motivo'],
    ...logs.map(log => [rotulos[log.status], log.aba, log.linha, log.nome, log.cpf, log.referencia, log.valor, log.mensagem]),
  ];
  const url = URL.createObjectURL(new Blob(['\uFEFF', linhas.map(linha => linha.map(celula).join(';')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'log-importacao.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function LogImportacao({ logs }: { logs: ImportacaoNegociosLogDto[] }) {
  return <div className="space-y-2">
    <button type="button" className={botao} onClick={() => baixarLog(logs)}><Download className="size-4" /> Baixar log</button>
    <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-[540px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <tr>{['Linha', 'Cliente', 'Situação', 'Motivo'].map(c => <th key={c} className="p-2.5">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {logs.map(log => <tr key={log.ordem}>
            <td className="p-2.5">{log.aba} · {log.linha}</td><td className="p-2.5">{log.nome || log.cpf || '—'}</td>
            <td className="p-2.5">{rotulos[log.status]}</td><td className="p-2.5">{log.mensagem}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function ResumoDistribuicao({ distribuicao }: { distribuicao: ImportacaoPlanilhaAnaliseDto['distribuicao'] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <thead><tr>{['Cobradora', 'Clientes', 'Negócios', 'Valor'].map(coluna => <th key={coluna} className="p-2">{coluna}</th>)}</tr></thead>
    <tbody>{distribuicao.map(d => <tr key={d.cobradoraId ?? 'sem'} className="border-t border-slate-100 dark:border-slate-800">
      <td className="p-2">{d.nome}</td><td className="p-2">{d.clientes}</td><td className="p-2">{d.negocios}</td><td className="p-2">{formatCurrency(d.valorTotal)}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function ImportarDadosPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [aba, setAba] = useState<'importar' | 'historico' | 'gerenciar'>('importar');
  const [etapa, setEtapa] = useState(0);
  const [periodo, setPeriodo] = useState('');
  const [modo, setModo] = useState<ModoImportacao>('adicionar');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [analise, setAnalise] = useState<ImportacaoPlanilhaAnaliseDto | null>(null);
  const [participantes, setParticipantes] = useState<number[]>([]);
  const [participantesAnalisados, setParticipantesAnalisados] = useState<number[]>([]);
  const [resultado, setResultado] = useState<ImportacaoNegociosResultadoDto | null>(null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState('');
  const [historicoRefreshKey, setHistoricoRefreshKey] = useState(0);
  const [anoCobranca, mesCobranca] = periodo.split('-').map(Number);
  const periodoValido = anoCobranca >= 2000 && anoCobranca <= 2100 && mesCobranca >= 1 && mesCobranca <= 12;
  const podeSubstituir = modo === 'adicionar' || analise?.rejeitados === 0;
  const periodoExibido = periodo.split('-').reverse().join('/');
  const distribuicaoAtual = participantes.length === participantesAnalisados.length &&
    participantes.every(id => participantesAnalisados.includes(id));

  function selecionarArquivo(file?: File) {
    if (!file) return;
    setArquivo(null);
    setAnalise(null);
    setErro('');
    if (!/\.(xls|xlsx)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) {
      setErro('Selecione um arquivo .xls ou .xlsx de até 10 MB.');
      return;
    }
    setArquivo(file);
  }

  function alterarCobradora(id: number) {
    setParticipantes(atuais => atuais.includes(id) ? atuais.filter(item => item !== id) : [...atuais, id]);
  }

  async function executar(destino: number) {
    if (!arquivo || !periodoValido || processando) return;
    setProcessando(true);
    setProgresso(0);
    setErro('');
    const dados = { arquivo, mesCobranca, anoCobranca, modo, participantes, onProgress: setProgresso };
    try {
      if (destino === 5 && analise) {
        setResultado(await importarNegocios({ ...dados, revisao: analise.revisao }));
        setHistoricoRefreshKey(chave => chave + 1);
      } else {
        const nova = await analisarPlanilhaNegocios(dados);
        setAnalise(nova);
        setParticipantesAnalisados(participantes);
        if (destino === 4 && (nova.semDistribuicao || nova.novos + nova.existentes === 0 ||
            (modo !== 'adicionar' && nova.rejeitados))) {
          setErro('Revise os registros rejeitados e selecione cobradoras para os negócios sem responsável.');
          return;
        }
        setEtapa(destino);
      }
    } catch (error) {
      const resposta = isAxiosError<{ message?: string; referencia?: string }>(error) ? error.response : undefined;
      if (isAxiosError(error) && !resposta && error.request) {
        setErro('A API do CRM não respondeu. Verifique a conexão e tente novamente.');
      } else {
        const mensagem = resposta?.data?.message ?? 'Não foi possível processar a importação.';
        const referencia = resposta?.data?.referencia;
        setErro(referencia ? `${mensagem} Referência ${referencia}.` : mensagem);
      }
      if (destino === 5 && resposta?.status === 409) setEtapa(3);
    } finally {
      setProcessando(false);
    }
  }

  function iniciarNova() {
    setEtapa(0);
    setPeriodo('');
    setModo('adicionar');
    setArquivo(null);
    setAnalise(null);
    setParticipantes([]);
    setParticipantesAnalisados([]);
    setResultado(null);
    setErro('');
  }

  return <div className="mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="font-display text-2xl font-bold">Importação de negócios</h1><p className="text-sm text-slate-500">Carteiras de cobrança do Sistema Vida</p></div>
      {resultado && <button type="button" className={botao} onClick={iniciarNova}>Nova importação</button>}
    </div>
    <div className="flex flex-wrap gap-2">
      {([{ id: 'importar', texto: 'Importar', Icon: UploadCloud },
        { id: 'historico', texto: 'Histórico', Icon: History }, { id: 'gerenciar', texto: 'Resumo por mês', Icon: Database }] as const).map(({ id, texto, Icon }) =>
        <button key={id} type="button" className={aba === id ? principal : botao} onClick={() => setAba(id)}><Icon className="size-4" />{texto}</button>)}
    </div>

    {aba === 'historico' && <HistoricoImportacoes refreshKey={historicoRefreshKey} />}
    {aba === 'gerenciar' && <GerenciarMesCobranca />}
    {aba === 'importar' && <>
      {erro && <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200"><AlertCircle className="size-4 shrink-0" />{erro}</div>}
      {resultado ? <section className={painel + ' space-y-4'}>
        <h2 className="flex items-center gap-2 font-bold"><CheckCircle2 className="size-5 text-emerald-600" /> Importação concluída</h2>
        <p className="text-sm">{periodoExibido} · {resultado.inseridos} novos · {resultado.vinculados} existentes · {resultado.naoImportados} rejeitados · {formatCurrency(resultado.valorImportado)}</p>
        <LogImportacao logs={resultado.logs} />
      </section> : <section className={painel + ' space-y-5'}>
        <ol aria-label="Etapas da importação" className="flex flex-wrap gap-x-5 gap-y-2 border-b border-slate-100 pb-4 dark:border-slate-800">
          {etapas.map((nome, indice) => <li key={nome} aria-current={indice === etapa ? 'step' : undefined}
            className={indice === etapa ? 'text-sm font-bold text-indigo-700 dark:text-indigo-300' : 'text-sm text-slate-500'}>{nome}</li>)}
        </ol>

        {etapa === 0 && <div className="space-y-4">
          <label className="flex w-fit flex-col gap-1 text-sm font-semibold">Mês de cobrança
            <input className={campo} type="month" min="2000-01" max="2100-12" value={periodo} onChange={e => setPeriodo(e.target.value)} />
          </label>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-bold">Operação</legend>
            {(Object.keys(modos) as ModoImportacao[]).map(id =>
              <label key={id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input className="mt-1 accent-indigo-600" type="radio" name="modo" value={id} checked={modo === id} onChange={() => setModo(id)} />
                <span className="text-sm"><strong>{modos[id].nome}</strong><span className="block text-xs text-slate-500">{modos[id].descricao}</span></span>
              </label>)}
          </fieldset>
        </div>}

        {etapa === 1 && <div className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>Acesse o Sistema Vida.</li><li>Abra o Relatório de Clientes que não Descontaram.</li>
            <li>Selecione os filtros e estipulantes desejados.</li><li>Gere o arquivo Excel.</li><li>Arraste o arquivo para o CRM.</li>
          </ol>
          <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={e => selecionarArquivo(e.target.files?.[0])} />
          <button type="button" disabled={processando} onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (!processando) setArrastando(true); }}
            onDragLeave={() => setArrastando(false)} onDrop={e => {
              e.preventDefault();
              setArrastando(false);
              if (!processando) selecionarArquivo(e.dataTransfer.files[0]);
            }}
            className={'flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-sm font-semibold ' +
              (arrastando ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-slate-300 dark:border-slate-700')}>
            <FileSpreadsheet className="size-7 text-indigo-600" />{arquivo?.name ?? 'Arraste o Excel ou selecione um arquivo'}
            <span className="text-xs text-slate-500">.xls ou .xlsx · até 10 MB</span>
          </button>
        </div>}

        {etapa === 2 && analise && <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {[['Registros encontrados', analise.totalLinhas], ['Prêmios encontrados', formatCurrency(analise.valorEncontrado)],
              ['Valor das cobranças aptas', formatCurrency(analise.valorTotal)], ['Novos', analise.novos],
              ['Existentes', analise.existentes], ['Rejeitados', analise.rejeitados]].map(([label, valor]) =>
              <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500">{label}</p><strong>{valor}</strong></div>)}
          </div>
          <p className="text-sm">Competências encontradas · {analise.competencias.map(p => String(p.mes).padStart(2, '0') + '/' + p.ano).join(', ') || '—'}</p>
          {!podeSubstituir && <p className="text-sm text-amber-700 dark:text-amber-300">Corrija as linhas rejeitadas antes de substituir ou limpar a carga do mês.</p>}
          <LogImportacao logs={analise.logs} />
        </div>}

        {etapa === 3 && analise && <div className="space-y-4">
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-bold">Cobradoras participantes</legend>
            <p className="text-xs text-slate-500">A responsável existente tem prioridade, seguida da responsável informada na planilha. Os demais segurados são distribuídos em grupo pelo valor das parcelas.</p>
            <div className="grid max-h-52 gap-2 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {analise.cobradoras.map(c => <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={participantes.includes(c.id)} disabled={processando} onChange={() => alterarCobradora(c.id)} />{c.nome}
              </label>)}
            </div>
          </fieldset>
          <button type="button" className={botao} disabled={processando} onClick={() => void executar(3)}>Calcular prévia</button>
          {distribuicaoAtual ? <>
            <ResumoDistribuicao distribuicao={analise.distribuicao} />
            {analise.semDistribuicao > 0 && <p className="text-sm text-amber-700 dark:text-amber-300">{analise.semDistribuicao} negócio(s) novo(s) aguardando distribuição.</p>}
          </> : <p className="text-sm text-slate-500">Calcule a prévia com a seleção atual ou continue para conferir a distribuição no resumo.</p>}
        </div>}

        {etapa === 4 && analise && <div className="space-y-4"><dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
          {[['Mês de cobrança', periodoExibido], ['Operação', modos[modo].nome], ['Arquivo', arquivo?.name],
            ['Valor da carga', formatCurrency(analise.valorTotal)], ['Novos', analise.novos], ['Existentes', analise.existentes],
            ['Rejeitados', analise.rejeitados], ['Vínculos anteriores a encerrar', analise.vinculosEncerrados]].map(([label, valor]) =>
            <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{valor}</dd></div>)}
        </dl><ResumoDistribuicao distribuicao={analise.distribuicao} /></div>}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {etapa > 0 ? <button type="button" className={botao} disabled={processando} onClick={() => { setEtapa(etapa - 1); setErro(''); }}><ArrowLeft className="size-4" />Voltar</button> : <span />}
          {processando && <span role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />{progresso < 100 ? 'Enviando Excel…' : 'Processando…'}</span>}
          <button type="button" className={principal} disabled={processando || (etapa === 0 && !periodoValido) ||
            (etapa === 1 && !arquivo) || (etapa === 2 && (!podeSubstituir || !analise || analise.novos + analise.existentes === 0))}
            onClick={() => {
              setErro('');
              if (etapa === 1 || etapa === 3 || etapa === 4) void executar(etapa + 1);
              else setEtapa(etapa + 1);
            }}>
            {etapa === 1 ? 'Analisar planilha' : etapa === 4 ? 'Confirmar importação' : 'Continuar'}<ArrowRight className="size-4" />
          </button>
        </div>
      </section>}
    </>}
  </div>;
}
