import React, { useState } from 'react';
import {
  X, Plus, Trash2, Check, Zap, Sparkles, Search, ChevronDown, ChevronUp,
  MessageCircle, Phone, CreditCard, FileText
} from 'lucide-react';
import { useQuickActivityTemplates } from '../../hooks/useQuickActivityTemplates';
import type { SalvarAtividadeAtalhoCommand } from '../../services/negociosService';

interface QuickActivitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const getStyleFromType = (tipo: string) => {
  if (tipo === 'whatsapp') {
    return {
      label: 'WhatsApp',
      iconBox: 'bg-emerald-500',
      badgeClasses: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: (c: string) => <MessageCircle className={c} />
    };
  }
  if (tipo === 'ligacao') {
    return {
      label: 'Ligação',
      iconBox: 'bg-[#1FB6FF]',
      badgeClasses: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: (c: string) => <Phone className={c} fill="currentColor" />
    };
  }
  if (tipo === 'pagamento') {
    return {
      label: 'Pagamento',
      iconBox: 'bg-slate-500',
      badgeClasses: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      icon: (c: string) => <CreditCard className={c} />
    };
  }
  return {
    label: 'Anotação',
    iconBox: 'bg-amber-500',
    badgeClasses: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: (c: string) => <FileText className={c} />
  };
};

export const QuickActivitiesDrawer: React.FC<QuickActivitiesDrawerProps> = ({ isOpen, onClose }) => {
  const { templates, loading, addTemplate, deleteTemplate } = useQuickActivityTemplates();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  const [channel, setChannel] = useState<'whatsapp' | 'ligacao' | 'pagamento' | 'anotacao'>('whatsapp');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const channelMap: Record<string, string> = {
      whatsapp: 'WhatsApp',
      ligacao: 'Ligação',
      pagamento: 'Pagamento',
      anotacao: 'Anotação'
    };

    const cmd: SalvarAtividadeAtalhoCommand = {
      nome: cleanTitle,
      tipo: channel,
      tituloPadrao: cleanTitle,
      descricaoPadrao: description.trim() || cleanTitle,
      ordem: templates.length + 1,
      ativo: true
    };

    try {
      await addTemplate(cmd);
      showNotification(`Modelo "${cleanTitle}" cadastrado com sucesso!`);
      setTitle('');
      setDescription('');
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao criar atalho');
    }
  };

  const filteredTemplates = templates.filter((tpl) => {
    const matchesChannel = filterChannel === 'all' || tpl.tipo === filterChannel;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || tpl.tituloPadrao.toLowerCase().includes(query) || (tpl.descricaoPadrao && tpl.descricaoPadrao.toLowerCase().includes(query));
    return matchesChannel && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      <aside
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20 shrink-0">
              <Zap className="w-4.5 h-4.5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-tight">Atividades Rápidas</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  {templates.length} atalhos
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Modelos prontos exibidos no menu dos cards para registro em 1 clique.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedbackMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="flex-1">{feedbackMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar overscroll-contain">
          {!isFormOpen ? (
            <button onClick={() => setIsFormOpen(true)} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[13px] font-bold transition-all cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Atalho Rápido</span>
            </button>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Plus className="w-3 h-3 font-bold" />
                  </div>
                  <h4 className="font-bold text-[13px] text-slate-800 dark:text-slate-100">Criar Atalho Rápido</h4>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateTemplate} className="p-4 flex flex-col gap-4">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Canal da Atividade</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['whatsapp', 'ligacao', 'pagamento', 'anotacao'].map((id) => {
                      const style = getStyleFromType(id);
                      const isSelected = channel === id;
                      return (
                        <button key={id} type="button" onClick={() => setChannel(id as any)} className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                          {style.icon(`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`)}
                          <span>{style.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Título do Atalho (Visível no Menu)</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Mensagem de Cobrança (Fase 1)" className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400" required autoFocus />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Texto Descritivo Padrão</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Este texto será salvo automaticamente no histórico quando o atalho for usado..." rows={2} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400" />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 mt-1">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={!title.trim()} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Check className="w-3.5 h-3.5" />Salvar Atalho</button>
                </div>
              </form>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1 gap-4">
              <h4 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modelos Disponíveis</h4>
              <div className="flex-1 flex justify-end gap-2">
                <select value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer">
                  <option value="all">Todos os tipos</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="ligacao">Ligação</option>
                  <option value="pagamento">Pagamento</option>
                  <option value="anotacao">Anotação</option>
                </select>
                <div className="relative w-40">
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar atalho..." className="w-full pl-8 pr-2.5 py-1.5 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500" />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-500">Carregando...</div>
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map((tpl) => {
                const style = getStyleFromType(tpl.tipo);
                const isExpanded = expandedTemplateId === tpl.publicId;
                const hasDescription = !!tpl.descricaoPadrao && tpl.descricaoPadrao !== tpl.tituloPadrao;
                return (
                  <div key={tpl.publicId} className={`rounded-xl border transition-all ${isExpanded ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20' : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'}`}>
                    <div className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none" onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.publicId)}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${style.iconBox}`} title={style.label}>
                          {style.icon('w-3.5 h-3.5 shrink-0 text-white')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">{tpl.tituloPadrao}</h5>
                            <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${style.badgeClasses}`}>{style.label}</span>
                          </div>
                          {!isExpanded && hasDescription && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{tpl.descricaoPadrao}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.publicId)} className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button type="button" onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir o modelo "${tpl.tituloPadrao}"?`)) {
                            deleteTemplate(tpl.publicId);
                            showNotification(`Modelo excluído.`);
                          }
                        }} className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 flex flex-col gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Texto registrado no card e timeline:</span>
                          <p className="text-slate-700 font-medium leading-relaxed">{tpl.descricaoPadrao || tpl.tituloPadrao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Sparkles className="w-4 h-4" /></div>
                <p className="text-xs font-semibold text-slate-700">Nenhum atalho encontrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-end shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer">
            Concluir
          </button>
        </div>
      </aside>
    </div>
  );
};
