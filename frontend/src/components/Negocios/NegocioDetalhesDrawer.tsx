import React, { useState } from 'react';
import { X, Briefcase, Calendar, Phone, FileText, MapPin, Tag, MessageCircle, Plus, Copy, Check, MessageSquare } from 'lucide-react';
import type { NegocioDto, EtapaDto } from '../../services/negociosService';

interface NegocioDetalhesDrawerProps {
  negocio: NegocioDto | null;
  etapas: EtapaDto[];
  isOpen: boolean;
  onClose: () => void;
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
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'atividades' | 'historico'>('geral');
  const [showAddActivityForm, setShowAddActivityForm] = useState(false);

  if (!isOpen || !negocio) return null;

  // Encontra a etapa atual
  const etapaAtual = etapas.find(e => e.codigo === negocio.etapaCodigo);
  const colorHex = etapaAtual?.corHex || '#6366f1';

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
              <span className="font-display font-bold text-2xl text-indigo-600 dark:text-indigo-400 tracking-tight">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-xs transition-all cursor-pointer"
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
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
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
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Registro de Atividades</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold">
                0
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`pb-2 px-1 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'historico'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Histórico</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold">
                1
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
                
                {/* Cliente */}
                <div className="flex flex-col col-span-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Cliente / Devedor</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{negocio.nomeCliente}</span>
                  </div>
                </div>

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

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Documento (CPF/CNPJ)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                      {negocio.documento || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato / Ref</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {negocio.referencia ? `#${negocio.referencia}` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Valor do Débito</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 tracking-tight">
                      {formatCurrency(negocio.valor)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Origem</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={negocio.origem}>
                    {negocio.origem || '—'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Data de Vencimento</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                    {negocio.dataVencimento ? new Date(negocio.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Responsável Atual</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 bg-indigo-100 text-indigo-700 border-indigo-200">
                      H
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">Helena</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Etapa do Pipeline</span>
                  <span className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                    {etapaAtual?.nome || '—'}
                  </span>
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
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 dark:bg-[#101624] dark:border-slate-800">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Nova Interação / Atividade (Em breve)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddActivityForm(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Esta funcionalidade está em construção. O banco de dados ainda não suporta atividades dinâmicas.
                  </p>
                </div>
              )}

              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma atividade registrada
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Este cliente ainda não possui interações de contato. Use o botão &quot;+ Registrar Nova Atividade&quot; acima para cadastrar ligações, WhatsApp ou anotações.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Caminho do negócio</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">1 evento</span>
              </div>
              <div className="relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 flex flex-col gap-4">
                
                <div className="relative flex flex-col gap-1">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-indigo-500 bg-indigo-50 shadow-xs border border-indigo-200">
                    <Briefcase className="w-3 h-3 text-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate">Negócio criado</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-medium text-slate-500">Sistema</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pl-0.5">Criado na etapa &quot;{etapaAtual?.nome}&quot;</p>
                </div>

              </div>
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
