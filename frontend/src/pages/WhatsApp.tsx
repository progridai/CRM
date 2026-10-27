import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, History, Loader2, MessageCircle, RefreshCw, Search, Send, Users, X, XCircle } from 'lucide-react';
import { listarNegocios, type NegocioDto } from '../services/negociosService';
import {
  listarDisparosWhatsApp,
  obterDisparoWhatsApp,
  type WhatsAppDisparoDetalheDto,
  type WhatsAppDisparoResumoDto,
} from '../services/whatsappService';
import { WhatsAppDisparoModal } from '../components/WhatsApp/WhatsAppDisparoModal';

const statusMeta: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  aceito_fornecedor: { label: 'Aceito pela Sisnetsul', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  rejeitado: { label: 'Rejeitado', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
  resultado_incerto: { label: 'Resultado incerto', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  ignorado: { label: 'Ignorado', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ?? 'Não foi possível carregar os dados do WhatsApp.';

const formatCompetencia = (negocio: NegocioDto) =>
  `${String(negocio.competenciaMes).padStart(2, '0')}/${negocio.competenciaAno}`;

export const WhatsAppPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [negocios, setNegocios] = useState<NegocioDto[]>([]);
  const [disparos, setDisparos] = useState<WhatsAppDisparoResumoDto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [operator, setOperator] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detail, setDetail] = useState<WhatsAppDisparoDetalheDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    try {
      const [negociosData, disparosData] = await Promise.all([
        listarNegocios(),
        listarDisparosWhatsApp(),
      ]);
      setNegocios(negociosData);
      setDisparos(disparosData);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const operators = useMemo(() => Array.from(new Set(
    negocios.map((item) => item.nomeOperador?.trim()).filter((name): name is string => Boolean(name)),
  )).sort((a, b) => a.localeCompare(b, 'pt-BR')), [negocios]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return negocios.filter((item) => {
      const matchesOperator = operator === 'todos' || item.nomeOperador === operator;
      const matchesSearch = !term || [item.nomeCliente, item.documento, item.telefonePrincipal, item.referencia]
        .some((value) => value?.toLocaleLowerCase('pt-BR').includes(term));
      return matchesOperator && matchesSearch;
    });
  }, [negocios, operator, search]);

  const allVisibleSelected = filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.publicId));
  const toggleVisible = () => {
    const visibleIds = filtered.map((item) => item.publicId);
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : Array.from(new Set([...current, ...visibleIds])));
  };

  const abrirDetalhe = async (publicId: string) => {
    setLoadingDetail(true);
    try {
      setDetail(await obterDisparoWhatsApp(publicId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MessageCircle className="h-5 w-5" /></span>
          <div><h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">WhatsApp</h1><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Disparos de mensagens oficiais pela integração Sisnetsul.</p></div>
        </div>
        <button type="button" onClick={() => void carregar()} disabled={loading} className="inline-flex h-9 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Atualizar</button>
      </div>

      <div className="flex w-fit rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={() => setActiveTab('novo')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${activeTab === 'novo' ? 'bg-white text-emerald-700 shadow-2xs dark:bg-slate-800 dark:text-emerald-300' : 'text-slate-500'}`}><Send className="h-3.5 w-3.5" />Novo disparo</button>
        <button type="button" onClick={() => setActiveTab('historico')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${activeTab === 'historico' ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`}><History className="h-3.5 w-3.5" />Histórico</button>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" />Carregando…</div>
      ) : activeTab === 'novo' ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Selecionar negócios</h2><p className="mt-0.5 text-[11px] text-slate-500">Telefones repetidos serão enviados uma única vez.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:w-72"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, documento ou telefone" className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></div>
              <select value={operator} onChange={(e) => setOperator(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><option value="todos">Todos os operadores</option>{operators.map((name) => <option key={name} value={name}>{name}</option>)}</select>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} className="h-4 w-4 rounded accent-emerald-600" />Selecionar os {filtered.length} exibidos</label>
            <div className="flex items-center gap-3"><span className="text-[11px] font-semibold text-slate-500">{selectedIds.length} selecionado(s)</span><button type="button" onClick={() => setModalOpen(true)} disabled={selectedIds.length === 0} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"><Send className="h-3.5 w-3.5" />Revisar disparo</button></div>
          </div>

          <div className="max-h-[560px] overflow-auto custom-scrollbar">
            <table className="w-full min-w-[820px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-bold uppercase tracking-wider text-slate-500 backdrop-blur dark:bg-slate-800/95"><tr><th className="w-12 px-4 py-3"></th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Competência</th><th className="px-4 py-3">Referência</th><th className="px-4 py-3">Operador</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((negocio) => (
                  <tr key={negocio.publicId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedIds.includes(negocio.publicId)} onChange={() => setSelectedIds((current) => current.includes(negocio.publicId) ? current.filter((id) => id !== negocio.publicId) : [...current, negocio.publicId])} className="h-4 w-4 rounded accent-emerald-600" /></td>
                    <td className="px-4 py-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{negocio.nomeCliente}</p><p className="text-[10px] text-slate-400">{negocio.documento || 'Documento indisponível'}</p></td>
                    <td className="px-4 py-3"><span className={negocio.telefonePrincipal ? 'text-slate-600 dark:text-slate-300' : 'font-semibold text-amber-600'}>{negocio.telefonePrincipal || 'Sem telefone'}</span></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatCompetencia(negocio)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{negocio.referencia || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{negocio.nomeOperador || 'Sem responsável'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">Nenhum negócio encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-4 dark:border-slate-800"><h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">Histórico de disparos</h2><p className="mt-0.5 text-[11px] text-slate-500">“Aceito” confirma a criação da campanha, não a entrega da mensagem.</p></div>
          <div className="overflow-auto custom-scrollbar">
            <table className="w-full min-w-[980px] border-collapse text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Campanha</th><th className="px-4 py-3">Operador</th><th className="px-4 py-3">Destinatários</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">ID externo</th><th className="px-4 py-3"></th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {disparos.map((disparo) => {
                  const meta = statusMeta[disparo.status] ?? statusMeta.pendente;
                  return <tr key={disparo.publicId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-4 py-3 text-slate-500">{new Date(disparo.criadoEm).toLocaleString('pt-BR')}</td><td className="px-4 py-3"><p className="font-semibold text-slate-800 dark:text-slate-100">{disparo.titulo}</p><p className="text-[10px] text-slate-400">{disparo.tipo === 'massa' ? 'Em massa' : 'Individual'} · {disparo.template}</p></td><td className="px-4 py-3 text-slate-600 dark:text-slate-300">{disparo.operadorNome}</td><td className="px-4 py-3"><span className="font-semibold text-slate-800 dark:text-slate-100">{disparo.totalDestinatarios}</span>{disparo.totalExcluidos > 0 && <span className="ml-1 text-[10px] text-amber-600">+ {disparo.totalExcluidos} excluído(s)</span>}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${meta.className}`}>{meta.label}</span></td><td className="px-4 py-3 font-mono text-[11px] text-slate-500">{disparo.campanhaIdExterno ?? '—'}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => void abrirDetalhe(disparo.publicId)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-300"><Eye className="h-3.5 w-3.5" />Detalhes</button></td></tr>;
                })}
                {disparos.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">Nenhum disparo registrado.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <WhatsAppDisparoModal isOpen={modalOpen} negocioIds={selectedIds} tipo="massa" onClose={() => setModalOpen(false)} onCompleted={() => { setSelectedIds([]); void carregar(); }} />

      {(detail || loadingDetail) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={() => setDetail(null)}>
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={(e) => e.stopPropagation()}>
            {loadingDetail && !detail ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div> : detail && <>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">{detail.disparo.titulo}</h2><p className="text-[11px] text-slate-500">{new Date(detail.disparo.criadoEm).toLocaleString('pt-BR')} · {detail.disparo.operadorNome}</p></div><button type="button" onClick={() => setDetail(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
              <div className="grid grid-cols-3 gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><Users className="h-4 w-4 text-indigo-500" /><p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{detail.disparo.totalDestinatarios}</p><p className="text-[10px] text-slate-400">destinatários</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><Clock3 className="h-4 w-4 text-amber-500" /><p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-slate-100">{detail.disparo.totalExcluidos}</p><p className="text-[10px] text-slate-400">excluídos</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">{detail.disparo.status === 'aceito_fornecedor' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}<p className="mt-2 truncate text-xs font-bold text-slate-900 dark:text-slate-100">{statusMeta[detail.disparo.status]?.label}</p><p className="text-[10px] text-slate-400">status</p></div></div>
              <div className="mx-4 mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                <p>{detail.disparo.erro || detail.disparo.mensagemRetorno || 'Sem mensagem retornada.'}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">{detail.disparo.endpointFornecedor} · HTTP Sisnetsul: {detail.disparo.httpStatusFornecedor ?? 'sem resposta'}</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar"><div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">{detail.destinatarios.map((item, index) => { const meta = statusMeta[item.status] ?? statusMeta.pendente; return <div key={`${item.negocioPublicId}-${index}`} className="flex items-start justify-between gap-3 px-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{item.nome}</p><p className="text-[10px] text-slate-400">{item.numero ? `+${item.numero}` : 'Sem número'}{item.erro ? ` · ${item.erro}` : ''}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${meta.className}`}>{meta.label}</span></div>; })}</div></div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
};
