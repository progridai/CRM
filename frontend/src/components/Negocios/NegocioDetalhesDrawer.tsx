import React, { useState, useEffect } from 'react';
import { X, Phone, FileText, MessageCircle, Plus, MessageSquare, Loader2, CreditCard, Trash2 } from 'lucide-react';
import type { NegocioDto, EtapaDto } from '../../services/negociosService';
import { DealHistoryTimeline } from './DealHistoryTimeline';
import { getNameInitial } from '../../utils';

interface NegocioDetalhesDrawerProps {
  negocio: NegocioDto | null;
  etapas: EtapaDto[];
  isOpen: boolean;
  onClose: () => void;
  onAtividadeRegistrada?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const NegocioDetalhesDrawer: React.FC<NegocioDetalhesDrawerProps> = ({
  negocio,
  etapas,
  isOpen,
  onClose,
  onAtividadeRegistrada
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'atividades' | 'historico'>('geral');
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);

  const [atividades, setAtividades] = useState<any[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [novaAtividadeTipo, setNovaAtividadeTipo] = useState('whatsapp');
  const [novaAtividadeTitulo, setNovaAtividadeTitulo] = useState('');
  const [novaAtividadeDescricao, setNovaAtividadeDescricao] = useState('');
  const [salvandoAtividade, setSalvandoAtividade] = useState(false);

  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const loadAtividades = async () => {
    if (!negocio) return;
    setLoadingAtividades(true);
    try {
      const { listarAtividades } = await import('../../services/negociosService');
      const data = await listarAtividades([negocio.publicId]);
      setAtividades(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const loadHistorico = async () => {
    if (!negocio) return;
    setLoadingHistorico(true);
    try {
      const { listarHistorico } = await import('../../services/negociosService');
      const data = await listarHistorico(negocio.publicId);
      setHistorico(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'atividades' && negocio) {
      loadAtividades();
    }
  }, [isOpen, activeTab, negocio?.publicId]);

  // Load historico immediately to get the count for the tab badge
  useEffect(() => {
    if (isOpen && negocio) {
      loadHistorico();
    }
  }, [isOpen, negocio?.publicId]);

  const handleRegistrarAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negocio || !novaAtividadeTitulo.trim()) return;

    setSalvandoAtividade(true);
    try {
      const { registrarAtividade } = await import('../../services/negociosService');
      await registrarAtividade(negocio.publicId, {
        tipo: novaAtividadeTipo,
        titulo: novaAtividadeTitulo,
        descricao: novaAtividadeDescricao,
      });
      setNovaAtividadeTitulo('');
      setNovaAtividadeDescricao('');
      setShowAddActivityForm(false);
      loadAtividades();
      if (onAtividadeRegistrada) onAtividadeRegistrada();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar atividade.');
    } finally {
      setSalvandoAtividade(false);
    }
  };

  if (!isOpen || !negocio) return null;

  const etapaAtual = etapas.find((etapa) => etapa.codigo === negocio.etapaCodigo);
  const nomeOperador = negocio.nomeOperador?.trim() || 'Sem responsável';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  {etapaAtual?.nome || 'Etapa desconhecida'}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                {negocio.nomeCliente}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Amount and Top Actions */}
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                Valor do Débito Atual
              </span>
              <span className="font-display font-bold text-3xl text-[#5A52FF] dark:text-indigo-400 tracking-tight">
                {formatCurrency(negocio.valor)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {negocio.telefonePrincipal && negocio.telefonePrincipal.trim() && (
                <a
                  href={`https://web.whatsapp.com/send?phone=55${negocio.telefonePrincipal.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
                  <span>WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => {
                  setActiveTab('atividades');
                  setShowAddActivityForm(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5A52FF] hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Atividade</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 -mb-6 mt-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('geral')}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'geral'
                  ? 'border-[#5A52FF] text-[#5A52FF] dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Informações gerais
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('atividades')}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'atividades'
                  ? 'border-[#5A52FF] text-[#5A52FF] dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Registro de Atividades</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold">
                {negocio.atividadesCount || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-[#5A52FF] text-[#5A52FF] dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Histórico</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold">
                {historico.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-6">
            {/* Resumo Cadastral Grid */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Dados Operacionais
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
                
                {/* Telefone Principal */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Telefone Principal</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {negocio.telefonePrincipal && negocio.telefonePrincipal.trim() ? (
                      <a 
                        href={`https://web.whatsapp.com/send?phone=55${negocio.telefonePrincipal.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        {negocio.telefonePrincipal}
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Telefone não informado</span>
                    )}
                  </div>
                </div>

                {/* Documento */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Documento (CPF/CNPJ)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                      {negocio.documento || '—'}
                    </span>
                  </div>
                </div>

                {/* Contrato / Ref */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato / Ref</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {negocio.referencia ? `#${negocio.referencia}` : '—'}
                    </span>
                  </div>
                </div>

                {/* Competência */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Competência</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {negocio.competenciaMes && negocio.competenciaAno 
                        ? `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][negocio.competenciaMes - 1]}/${negocio.competenciaAno}`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Data de Vencimento */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Data de Vencimento</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      {negocio.dataVencimento ? new Date(negocio.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                    </span>
                  </div>
                </div>

                {/* Origem */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Origem</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={negocio.origem}>
                    {negocio.origem || '—'}
                  </span>
                </div>

                {/* Responsável Atual */}
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Responsável Atual</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 bg-indigo-100 text-indigo-700 border-indigo-200"
                      title={`Responsável: ${nomeOperador}`}
                    >
                      {getNameInitial(negocio.nomeOperador)}
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{nomeOperador}</span>
                  </div>
                </div>

                {/* Mudar Etapa do Pipeline */}
                <div className="flex flex-col col-span-2 mt-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Mudar Etapa do Pipeline</span>
                  <select
                    value={negocio.etapaCodigo}
                    disabled
                    className="w-full h-9 px-2 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-not-allowed opacity-80"
                  >
                    <option value={negocio.etapaCodigo}>{etapaAtual?.nome || '—'}</option>
                  </select>
                </div>

              </div>
            </section>
          </div>
          )}

          {activeTab === 'atividades' && (
            <div className="flex flex-col gap-4">
              {!showAddActivityForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddActivityForm(true)}
                  className="flex items-center justify-center gap-2 p-3 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-indigo-700 font-semibold text-xs transition-all cursor-pointer shadow-2xs dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-300 dark:hover:bg-indigo-900/50 dark:hover:border-indigo-700"
                >
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Registrar Nova Atividade / Contato</span>
                </button>
              ) : (
                <form onSubmit={handleRegistrarAtividade} className="p-5 bg-white rounded-xl border border-slate-200 flex flex-col gap-4 dark:bg-[#101624] dark:border-slate-800 shadow-sm mb-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                      Nova Interação / Atividade
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddActivityForm(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Canal / Tipo de Contato</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setNovaAtividadeTipo('whatsapp')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                          novaAtividadeTipo === 'whatsapp'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white dark:bg-slate-900 border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaAtividadeTipo('ligacao')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                          novaAtividadeTipo === 'ligacao'
                            ? 'bg-[#1FB6FF] border-[#1FB6FF] text-white'
                            : 'bg-white dark:bg-slate-900 border-[#1FB6FF] text-[#1FB6FF] hover:bg-[#1FB6FF]/10'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Ligação
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaAtividadeTipo('pagamento')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                          novaAtividadeTipo === 'pagamento'
                            ? 'bg-slate-500 border-slate-500 text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-500 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pagamento
                      </button>
                      <button
                        type="button"
                        onClick={() => setNovaAtividadeTipo('anotacao')}
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                          novaAtividadeTipo === 'anotacao'
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white dark:bg-slate-900 border-amber-400 text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Anotação
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Título da Atividade *</label>
                    <input
                      type="text"
                      value={novaAtividadeTitulo}
                      onChange={e => setNovaAtividadeTitulo(e.target.value)}
                      placeholder="Ex: Acordo aceito em 2x"
                      required
                      className="w-full h-10 px-3 text-sm border border-[#5A52FF]/50 dark:border-indigo-500/50 rounded-lg bg-white dark:bg-slate-900 focus:border-[#5A52FF] focus:ring-1 focus:ring-[#5A52FF] outline-none transition-all dark:text-slate-200 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Detalhamento do contato</label>
                    <textarea
                      value={novaAtividadeDescricao}
                      onChange={e => setNovaAtividadeDescricao(e.target.value)}
                      placeholder="Descreva o que foi acordado com o devedor..."
                      className="w-full min-h-[80px] p-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-y dark:text-slate-200 placeholder:text-slate-400"
                    />
                  </div>

                  <div className="flex justify-end pt-3 gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => setShowAddActivityForm(false)}
                      className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoAtividade || !novaAtividadeTitulo.trim()}
                      className="flex items-center gap-1.5 px-6 py-2 bg-[#5A52FF] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      {salvandoAtividade && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Registrar
                    </button>
                  </div>
                </form>
              )}

              {loadingAtividades ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs text-slate-500">Carregando histórico...</span>
                </div>
              ) : atividades.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1 max-w-xs">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Nenhuma atividade registrada
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                      Este cliente ainda não possui interações de contato registradas. Use o botão &quot;+ Registrar Nova Atividade&quot; acima.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mt-4">
                  {atividades.map((ativ, index) => {
                    const isLast = index === atividades.length - 1;
                    return (
                    <div key={ativ.publicId} className="relative pl-10 pb-6">
                      {/* Linha vertical */}
                      {!isLast && (
                        <div className="absolute left-4 top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>
                      )}
                      
                      {/* Ícone Redondo Flutuante */}
                      <div className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                        ativ.tipo === 'whatsapp' ? 'bg-emerald-500' : 
                        ativ.tipo === 'ligacao' ? 'bg-[#1FB6FF]' : 
                        ativ.tipo === 'pagamento' ? 'bg-slate-500' : 
                        'bg-amber-500'
                      }`}>
                        {ativ.tipo === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> :
                         ativ.tipo === 'ligacao' ? <Phone className="w-4 h-4 fill-current" /> :
                         ativ.tipo === 'pagamento' ? <CreditCard className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {/* Badge tipo */}
                          <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold text-white shadow-sm ${
                            ativ.tipo === 'whatsapp' ? 'bg-emerald-500' : 
                            ativ.tipo === 'ligacao' ? 'bg-[#1FB6FF]' : 
                            ativ.tipo === 'pagamento' ? 'bg-slate-500' : 
                            'bg-amber-500'
                          }`}>
                            {ativ.tipo === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> :
                             ativ.tipo === 'ligacao' ? <Phone className="w-3.5 h-3.5 fill-current" /> :
                             ativ.tipo === 'pagamento' ? <CreditCard className="w-3.5 h-3.5" /> :
                             <FileText className="w-3.5 h-3.5" />}
                            {ativ.tipo.charAt(0).toUpperCase() + ativ.tipo.slice(1)}
                          </span>
                          <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{ativ.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider">
                            {new Date(ativ.ocorridoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).toUpperCase()}
                          </span>
                          <button className="text-slate-300 hover:text-red-500 transition-colors cursor-pointer p-0.5">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {ativ.descricao && <p className="mt-2.5 text-[13px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ativ.descricao}</p>}
                      <div className="mt-2.5 text-[11px] text-slate-400 font-medium">
                        Registrado por: {ativ.nomeUsuario}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="flex flex-col gap-4">
              {loadingHistorico ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs text-slate-500">Carregando histórico...</span>
                </div>
              ) : (
                <DealHistoryTimeline events={historico} />
              )}
            </div>
          )}

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button 
             onClick={onClose}
             className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
           >
             Fechar Detalhes
           </button>
        </div>
      </div>
    </>
  );
};
