import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Check,
  Phone,
  CreditCard,
  FileText,
  Clock,
  X,
  ExternalLink,
  User,
  Zap
} from 'lucide-react';
import { Activity, Deal } from '../types';
import { formatPersonName } from '../utils';
import {
  QuickActivityTemplate,
  useQuickActivityTemplates
} from '../quickActivityTemplates';
import {
  getActivityStyle,
  ACTIVITY_CHANNEL_STYLES
} from '../activityStyles';

export type { QuickActivityTemplate };

export interface QuickActivityMenuProps {
  deals: Deal[];
  anchorRect: DOMRect;
  initialTab?: 'history' | 'quick_create';
  isOpen: boolean;
  onClose: () => void;
  onAddActivity: (activity: Omit<Activity, 'id' | 'timestamp' | 'author'>) => void;
  onOpenDetails?: () => void;
  onOpenManagerDrawer?: () => void;
}

export const QuickActivityMenu: React.FC<QuickActivityMenuProps> = ({
  deals,
  anchorRect,
  initialTab = 'history',
  isOpen,
  onClose,
  onAddActivity,
  onOpenDetails,
  onOpenManagerDrawer
}) => {
  const [currentTab, setCurrentTab] = useState<'history' | 'quick_create' | 'custom_form'>(initialTab);
  const [justSaved, setJustSaved] = useState(false);

  // Sync initialTab when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentTab(initialTab);
      setJustSaved(false);
    }
  }, [isOpen, initialTab]);

  // Form states for custom activity
  const [newChannel, setNewChannel] = useState<'whatsapp' | 'call' | 'payment' | 'note'>('whatsapp');
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');

  // Use shared and synchronized templates
  const { templates: allTemplates, addTemplate } = useQuickActivityTemplates();

  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute all activities consolidated across provided deals, sorted newest first
  const allActivities: Activity[] = React.useMemo(() => {
    const list: Activity[] = [];
    deals.forEach((deal) => {
      if (Array.isArray(deal.activities)) {
        list.push(...deal.activities);
      }
    });
    // Remove duplicates if any (by id)
    const uniqueMap = new Map<string, Activity>();
    list.forEach((act) => {
      if (!uniqueMap.has(act.id)) {
        uniqueMap.set(act.id, act);
      }
    });
    return Array.from(uniqueMap.values());
  }, [deals]);

  const totalActivities = allActivities.length;
  const clientName = deals[0]?.clientName || 'Cliente';

  // Calculate coords based on anchorRect
  const popoverWidth = 330;
  const approxHeight = 390;

  let left = anchorRect.right - popoverWidth + 20;
  if (left < 12) left = 12;
  if (left + popoverWidth > window.innerWidth - 12) {
    left = window.innerWidth - popoverWidth - 12;
  }

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const placeAbove = spaceBelow < approxHeight && spaceAbove > spaceBelow;

  const positionStyles: React.CSSProperties = {
    position: 'fixed',
    left,
    width: popoverWidth,
    zIndex: 9999,
    ...(placeAbove
      ? { bottom: window.innerHeight - anchorRect.top + 6 }
      : { top: anchorRect.bottom + 6 })
  };

  // Close listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleWindowScroll = (e: Event) => {
      // Se a rolagem ocorreu dentro do próprio popover de atividades, NÃO fecha o modal!
      const target = e.target as Node | null;
      if (popoverRef.current && target && (popoverRef.current === target || popoverRef.current.contains(target))) {
        return;
      }
      onClose();
    };

    const handleWindowResize = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleWindowScroll, true);
    window.addEventListener('resize', handleWindowResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleWindowScroll, true);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: QuickActivityTemplate) => {
    onAddActivity({
      type: template.channel,
      title: template.title,
      description: template.description
    });
    onClose();
  };

  const handleCreateCustomActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const titleText = newTitle.trim() || newDetail.trim();
    if (!titleText) return;

    const channelMap: Record<string, string> = {
      whatsapp: 'WhatsApp',
      call: 'Ligação',
      payment: 'Pagamento',
      note: 'Anotação'
    };

    const channelLabel = channelMap[newChannel] || 'Atividade';

    onAddActivity({
      type: newChannel,
      title: newTitle.trim() || `${channelLabel}: ${newDetail.trim()}`,
      description: newDetail.trim() || titleText
    });

    // Salva como modelo para aparecer no menu de atalhos rápidos
    addTemplate({
      channel: newChannel,
      channelLabel,
      title: newTitle.trim() || titleText,
      description: newDetail.trim() || titleText
    });

    setNewTitle('');
    setNewDetail('');
    onClose();
  };

  return createPortal(
    <div
      ref={popoverRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      style={positionStyles}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/95 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/10 dark:ring-black/40 max-h-[85vh] flex flex-col overflow-hidden"
    >
      {/* 1. ABA DE HISTÓRICO DE ATIVIDADES (LISTA DAS ATIVIDADES) */}
      {currentTab === 'history' && (
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header do Frame */}
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3 h-3" />
              </div>
              <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight truncate">
                Atividades Registradas
              </h4>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 text-[10px] font-bold font-mono shrink-0">
                {totalActivities}
              </span>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              {/* Raiozinho: Cadastrar mensagem rápida */}
              <button
                type="button"
                onClick={() => setCurrentTab('quick_create')}
                className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Cadastrar mensagem rápida"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>

              {/* Ícone: Abrir registro de atividades nos detalhes */}
              {onOpenDetails && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDetails();
                  }}
                  className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                  title="Abrir registro de atividades nos detalhes"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Botão Fechar */}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lista de Atividades com rolagem */}
          <div 
            className="overflow-y-auto p-2.5 flex flex-col gap-2 custom-scrollbar flex-1 min-h-0 max-h-80 overscroll-contain rounded-b-2xl"
            onWheel={(e) => e.stopPropagation()}
          >
            {allActivities.length > 0 ? (
              allActivities.map((act) => {
                const style = getActivityStyle(act.type);
                return (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800 flex flex-col gap-1 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs shrink-0 ${style.badgeClasses}`}
                      >
                        {style.icon('w-3 h-3 shrink-0 text-white')}
                        <span>{style.label}</span>
                      </span>

                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                        {act.timestamp}
                      </span>
                    </div>

                    <h5 className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight mt-0.5">
                      {act.title}
                    </h5>

                    {act.description && act.description !== act.title && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-[9.5px] text-slate-400 dark:text-slate-500 mt-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <User className="w-2.5 h-2.5" />
                      <span>Registrado por: {act.author || 'Operador'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-slate-400">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Nenhuma atividade registrada
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-[200px]">
                  Utilize o menu do card para registrar uma nova atividade rápida.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. ABA DE REGISTRAR ATIVIDADE RÁPIDA */}
      {currentTab === 'quick_create' && (
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header do Menu */}
          <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 rounded-t-2xl shrink-0">
            <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight">
              Registrar Atividade Rápida
            </h4>

            <div className="flex items-center gap-1">
              {onOpenManagerDrawer && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManagerDrawer();
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Abrir gerenciador e cadastro na lateral"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {justSaved && (
            <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Atividade registrada com sucesso!</span>
            </div>
          )}

          {/* Lista de Ações Pré-definidas */}
          <div className="overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800 custom-scrollbar flex-1 min-h-0 max-h-64">
            {allTemplates.map((template) => {
              const style = getActivityStyle(template.channel);
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2.5 group/item cursor-pointer"
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/item:scale-110 shadow-xs ${style.iconBox}`}
                    title={style.label}
                  >
                    {style.icon('w-4 h-4 shrink-0 text-white')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover/item:text-indigo-900 dark:group-hover/item:text-indigo-300 leading-snug">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rodapé com botão de cadastrar/gerenciar atividades rápidas na lateral */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl shrink-0 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                if (onOpenManagerDrawer) {
                  onClose();
                  onOpenManagerDrawer();
                } else {
                  setCurrentTab('custom_form');
                }
              }}
              className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200/90 dark:border-indigo-800/80 flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs group"
              title="Cadastrar e gerenciar atividades rápidas na lateral"
            >
              <Plus className="w-4 h-4 font-bold text-indigo-600 dark:text-indigo-300 group-hover:scale-110 transition-transform" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* 3. FORMULÁRIO DE NOVA ATIVIDADE PERSONALIZADA */}
      {currentTab === 'custom_form' && (
        <form onSubmit={handleCreateCustomActivity} className="p-3.5 overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2.5 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentTab('quick_create')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-display font-bold text-xs text-slate-900 dark:text-slate-100 tracking-tight">
                Nova Atividade Rápida
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Seleção de Canal */}
          <div className="mb-2.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Canal do Contato
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'whatsapp', style: ACTIVITY_CHANNEL_STYLES.whatsapp },
                { id: 'call', style: ACTIVITY_CHANNEL_STYLES.call },
                { id: 'payment', style: ACTIVITY_CHANNEL_STYLES.payment },
                { id: 'note', style: ACTIVITY_CHANNEL_STYLES.note }
              ].map(({ id, style }) => {
                const isSelected = newChannel === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNewChannel(id as any)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? style.btnSelected
                        : style.btnUnselected
                    }`}
                  >
                    {style.icon(`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : style.iconColor}`)}
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título Resumido */}
          <div className="mb-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Título da Atividade
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Acordo aceito para dia 20"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Detalhamento */}
          <div className="mb-2.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Detalhamento / Ocorrência *
            </label>
            <textarea
              value={newDetail}
              onChange={(e) => setNewDetail(e.target.value)}
              placeholder="Descreva o que foi conversado ou acordado com o cliente..."
              rows={2}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none resize-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentTab('quick_create')}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={!newDetail.trim() && !newTitle.trim()}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Salvar Atividade</span>
            </button>
          </div>
        </form>
      )}
    </div>,
    document.body
  );
};
