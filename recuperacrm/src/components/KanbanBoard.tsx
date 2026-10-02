import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Filter,
  Kanban,
  List,
  Plus,
  ArrowUpDown,
  MoreVertical,
  ChevronDown,
  MessageCircle,
  Phone,
  Users,
  Check,
  FileText,
  Tag,
  Trash2,
  ExternalLink,
  Zap
} from 'lucide-react';
import { Deal, DealStage, ViewMode, Activity } from '../types';
import { formatCurrency, getWhatsAppLink, getOwnerAvatarColor, formatPersonName } from '../utils';
import { STAGE_CONFIG } from '../mockData';
import { getTagBadgeClass } from '../tagUtils';
import { TagPickerModal } from './TagPickerModal';
import { QuickActivityMenu } from './QuickActivityMenu';
import { QuickActivitiesDrawer } from './QuickActivitiesDrawer';

export interface ColumnDealGroup {
  groupKey: string;
  clientName: string;
  phone: string;
  document: string;
  origin: string;
  deals: Deal[];
}

export interface ActivityPopoverState {
  id: string;
  deals: Deal[];
  anchorRect: DOMRect;
  initialTab: 'history' | 'quick_create';
}

interface MenuAnchorState {
  id: string;
  rect: DOMRect;
  type: 'deal' | 'group';
  deal?: Deal;
  group?: ColumnDealGroup;
}

const calculateMenuCoords = (anchorRect: DOMRect, menuWidth: number, approxHeight: number) => {
  let left = anchorRect.right - menuWidth;
  if (left < 12) left = 12;
  if (left + menuWidth > window.innerWidth - 12) {
    left = window.innerWidth - menuWidth - 12;
  }

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  if (spaceBelow < approxHeight && spaceAbove > spaceBelow) {
    return {
      bottom: window.innerHeight - anchorRect.top + 4,
      left,
      top: undefined
    };
  }

  return {
    top: anchorRect.bottom + 4,
    left,
    bottom: undefined
  };
};

const getConsolidatedActivitiesCount = (dealList: Deal[]): number => {
  const seenIds = new Set<string>();
  dealList.forEach((deal) => {
    (deal.activities || []).forEach((act) => {
      seenIds.add(act.id);
    });
  });
  return seenIds.size;
};

interface KanbanBoardProps {
  deals: Deal[];
  onSelectDeal: (deal: Deal, initialTab?: 'geral' | 'atividades' | 'historico', expandActivityForm?: boolean) => void;
  onUpdateDealStage: (dealId: string | string[], newStage: DealStage) => void;
  onUpdateDeal?: (deal: Deal) => void;
  onOpenNewDealModal: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  initialOwnerFilter?: string;
}

const STAGES: DealStage[] = [
  'nova_posicao',
  'contato_em_andamento',
  'em_negociacao',
  'aguardando_pagamento',
  'encerrado_sem_pagamento',
  'quitado'
];

const STAGE_BG_VARS: Record<DealStage, string> = {
  nova_posicao: '--kanban-nova-posicao-bg',
  contato_em_andamento: '--kanban-contato-andamento-bg',
  em_negociacao: '--kanban-negociacao-bg',
  aguardando_pagamento: '--kanban-aguardando-pagamento-bg',
  encerrado_sem_pagamento: '--kanban-encerrado-sem-pagamento-bg',
  quitado: '--kanban-quitado-bg'
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  deals,
  onSelectDeal,
  onUpdateDealStage,
  onUpdateDeal,
  onOpenNewDealModal,
  viewMode,
  setViewMode,
  initialOwnerFilter
}) => {
  const [tagModalDeal, setTagModalDeal] = useState<Deal | null>(null);

  const handleSetDealTag = (targetDeal: Deal, newTag: string | undefined) => {
    if (onUpdateDeal) {
      onUpdateDeal({
        ...targetDeal,
        statusBadge: newTag,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleAddQuickActivity = (
    targetDeals: Deal[],
    newAct: Omit<Activity, 'id' | 'timestamp' | 'author'>
  ) => {
    if (!onUpdateDeal) return;

    const activity: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...newAct,
      author: 'Helena',
      timestamp: 'Agora'
    };

    targetDeals.forEach((deal) => {
      const currentDeal = deals.find((d) => d.id === deal.id) || deal;
      const currentActivities = currentDeal.activities || [];
      const updatedActivities = [activity, ...currentActivities];
      onUpdateDeal({
        ...currentDeal,
        commentCount: updatedActivities.length,
        activities: updatedActivities,
        updatedAt: new Date().toISOString()
      });
    });

    // Fecha todos os menus de atividades e menus suspensos de trás
    setActivityPopover(null);
    setMenuAnchor(null);
    setActiveMenuId(null);
  };

  const [filterSearch, setFilterSearch] = useState('');
  const [selectedCompetence, setSelectedCompetence] = useState('Todas');
  const [selectedOrigin, setSelectedOrigin] = useState('Todas');
  const [selectedOwner, setSelectedOwner] = useState(initialOwnerFilter || 'Todos');

  useEffect(() => {
    if (initialOwnerFilter) {
      setSelectedOwner(initialOwnerFilter);
    }
  }, [initialOwnerFilter]);

  // Modern popover filter state
  const [openFilter, setOpenFilter] = useState<'competence' | 'origin' | 'owner' | null>(null);

  // Drag-and-drop state (supports both single dealId and multiple dealIds)
  const [draggingDealIds, setDraggingDealIds] = useState<string[]>([]);

  // Active menu dropdown for card or group options
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchorState | null>(null);
  const [activityPopover, setActivityPopover] = useState<ActivityPopoverState | null>(null);
  const [isQuickActivitiesDrawerOpen, setIsQuickActivitiesDrawerOpen] = useState(false);

  useEffect(() => {
    const handleWindowClick = () => {
      setActiveMenuId(null);
      setMenuAnchor(null);
      setOpenFilter(null);
    };

    const handleScroll = () => {
      setActiveMenuId(null);
      setMenuAnchor(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuId(null);
        setMenuAnchor(null);
        setOpenFilter(null);
        setActivityPopover(null);
      }
    };

    window.addEventListener('click', handleWindowClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.clientName.toLowerCase().includes(filterSearch.toLowerCase()) ||
      deal.phone.includes(filterSearch) ||
      deal.document.includes(filterSearch) ||
      deal.reference.includes(filterSearch);

    const matchesCompetence =
      selectedCompetence === 'Todas' || deal.competence === selectedCompetence;

    const matchesOrigin =
      selectedOrigin === 'Todas' || deal.origin.includes(selectedOrigin);

    const matchesOwner =
      selectedOwner === 'Todos' || deal.owner === selectedOwner;

    return matchesSearch && matchesCompetence && matchesOrigin && matchesOwner;
  });

  // Metrics computation for Portfolio Indicators calculated dynamically from current Kanban deals
  const metrics = React.useMemo(() => {
    // 1. Saldo a recuperar: valor total ainda em aberto e quantidade de posições ainda não recuperadas
    const openDeals = filteredDeals.filter((d) => d.status !== 'quitado');
    const openAmount = openDeals.reduce((sum, d) => sum + d.amount, 0);
    const openCount = openDeals.length;

    // 2. Recuperado no mês: valor total já recuperado e quantidade de posições recuperadas
    const recoveredDeals = filteredDeals.filter((d) => d.status === 'quitado');
    const recoveredAmount = recoveredDeals.reduce((sum, d) => sum + d.amount, 0);
    const recoveredCount = recoveredDeals.length;

    // 3. Aguardando pagamento: valor total e posições nessa etapa
    const waitingPaymentDeals = filteredDeals.filter(
      (d) => d.status === 'aguardando_pagamento'
    );
    const waitingPaymentAmount = waitingPaymentDeals.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const waitingPaymentCount = waitingPaymentDeals.length;

    // 4. Sem contato: valor total ainda sem contato e posições nessa etapa (nova_posicao)
    const semContatoDeals = filteredDeals.filter(
      (d) => d.status === 'nova_posicao'
    );
    const semContatoAmount = semContatoDeals.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const semContatoCount = semContatoDeals.length;

    // 5. Progresso da meta: valor recuperado / meta, percentual e barra de progresso
    // Meta mensal coerente com o volume total distribuído no Kanban (R$ 10.000,00)
    const targetMonthly = 10000;
    const targetPercent =
      targetMonthly > 0
        ? Number(((recoveredAmount / targetMonthly) * 100).toFixed(1))
        : 0;

    // Indicadores secundários preservados para futuro uso no resumo expansível
    const inNegotiationDeals = filteredDeals.filter(
      (d) => d.status === 'em_negociacao'
    );
    const inNegotiationAmount = inNegotiationDeals.reduce(
      (sum, d) => sum + d.amount,
      0
    );
    const inNegotiationCount = inNegotiationDeals.length;

    const conversionRate =
      filteredDeals.length > 0
        ? `${((recoveredCount / filteredDeals.length) * 100).toFixed(1)}%`
        : '0%';

    return {
      openAmount,
      openCount,
      recoveredAmount,
      recoveredCount,
      waitingPaymentAmount,
      waitingPaymentCount,
      semContatoAmount,
      semContatoCount,
      targetMonthly,
      targetPercent,
      inNegotiationAmount,
      inNegotiationCount,
      conversionRate
    };
  }, [filteredDeals]);

  // Drag and drop handlers
  const handleDragStartSingle = (e: React.DragEvent, dealId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.setData('application/json', JSON.stringify({ dealIds: [dealId] }));
    setDraggingDealIds([dealId]);
  };

  const handleDragStartGroup = (e: React.DragEvent, dealIds: string[]) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', dealIds.join(','));
    e.dataTransfer.setData('application/json', JSON.stringify({ dealIds }));
    setDraggingDealIds(dealIds);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    let ids: string[] = [];

    try {
      const jsonRaw = e.dataTransfer.getData('application/json');
      if (jsonRaw) {
        const parsed = JSON.parse(jsonRaw);
        if (Array.isArray(parsed.dealIds) && parsed.dealIds.length > 0) {
          ids = parsed.dealIds;
        }
      }
    } catch {
      // ignore
    }

    if (ids.length === 0) {
      const textRaw = e.dataTransfer.getData('text/plain');
      if (textRaw) {
        ids = textRaw.split(',').filter(Boolean);
      } else if (draggingDealIds.length > 0) {
        ids = draggingDealIds;
      }
    }

    if (ids.length > 0) {
      onUpdateDealStage(ids, targetStage);
    }
    setDraggingDealIds([]);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Filter & Toolbar Bar */}
      <div className="bg-white dark:bg-slate-900/90 p-3 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input inside board and filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por nome, documento ou referência"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="h-8 pl-8 pr-3 w-72 sm:w-80 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 transition-all font-medium"
            />
          </div>

          {/* Competence filter - Modern custom dropdown */}
          <div className="relative">
            <button
              id="filter-competence-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === 'competence' ? null : 'competence');
              }}
              className={`h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none ${
                openFilter === 'competence'
                  ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-xs ring-1 ring-indigo-500/20 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-slate-400 font-normal">Competência:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedCompetence}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  openFilter === 'competence' ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </button>

            {openFilter === 'competence' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 dark:ring-black/40"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Competência Ativa
                </div>
                {[
                  { value: 'Todas', label: 'Todas' },
                  { value: 'Set/2026', label: 'Set/2026' }
                ].map((comp) => (
                  <button
                    key={comp.value}
                    type="button"
                    onClick={() => {
                      setSelectedCompetence(comp.value);
                      setOpenFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedCompetence === comp.value
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          selectedCompetence === comp.value ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      />
                      {comp.label}
                    </span>
                    {selectedCompetence === comp.value && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Origin filter - Modern custom dropdown */}
          <div className="relative">
            <button
              id="filter-origin-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === 'origin' ? null : 'origin');
              }}
              className={`h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none ${
                openFilter === 'origin'
                  ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-xs ring-1 ring-indigo-500/20 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-slate-400 font-normal">Origem:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100 max-w-[110px] truncate">
                {selectedOrigin}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  openFilter === 'origin' ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </button>

            {openFilter === 'origin' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 dark:ring-black/40"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Origem
                </div>
                {[
                  { value: 'Todas', label: 'Todas as origens' },
                  { value: 'FAEC', label: 'FAEC / Educacional' },
                  { value: 'VG Módulos', label: 'VG Módulos' },
                  { value: 'Master', label: 'Master Alpha' },
                  { value: 'Educa', label: 'Educa Mais' }
                ].map((orig) => (
                  <button
                    key={orig.value}
                    type="button"
                    onClick={() => {
                      setSelectedOrigin(orig.value);
                      setOpenFilter(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedOrigin === orig.value
                        ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                    }`}
                  >
                    <span className="truncate">{orig.label}</span>
                    {selectedOrigin === orig.value && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Owner filter - Modern custom dropdown with profile avatar and matching color */}
          <div className="relative">
            <button
              id="filter-owner-trigger"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenFilter(openFilter === 'owner' ? null : 'owner');
              }}
              className={`h-8 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all font-medium select-none ${
                openFilter === 'owner'
                  ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 shadow-xs ring-1 ring-indigo-500/20 text-slate-900 dark:text-slate-100'
                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-slate-400 font-normal">Operador:</span>
              <div className="flex items-center gap-1.5">
                {selectedOwner === 'Todos' ? (
                  <div className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold">
                    <Users className="w-2.5 h-2.5" />
                  </div>
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                      getOwnerAvatarColor(selectedOwner, selectedOwner === 'Helena' ? 'H' : 'Y').badge
                    }`}
                  >
                    {selectedOwner === 'Helena' ? 'H' : 'Y'}
                  </div>
                )}
                <span className="font-semibold text-slate-800 dark:text-slate-100">{selectedOwner}</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  openFilter === 'owner' ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </button>

            {openFilter === 'owner' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 dark:ring-black/40"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Filtrar por Operador
                </div>
                {[
                  {
                    value: 'Todos',
                    label: 'Todos',
                    avatar: null
                  },
                  {
                    value: 'Helena',
                    label: 'Helena',
                    avatar: 'H'
                  },
                  {
                    value: 'Ymalaia',
                    label: 'Ymalaia',
                    avatar: 'Y'
                  }
                ].map((op) => {
                  const isSelected = selectedOwner === op.value;
                  const colorConfig = op.avatar
                    ? getOwnerAvatarColor(op.value, op.avatar)
                    : null;

                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => {
                        setSelectedOwner(op.value);
                        setOpenFilter(null);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {op.avatar && colorConfig ? (
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${colorConfig.badge}`}
                          >
                            {op.avatar}
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold">
                            <Users className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <span>{op.label}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: View Mode Toggle & Primary Action */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Create Deal Button */}
          <button
            onClick={onOpenNewDealModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Negócio</span>
          </button>
        </div>
      </div>

      {/* Portfolio Indicators and Progress Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Saldo a recuperar */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Saldo a recuperar
            </span>
            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5 block">
              {formatCurrency(metrics.openAmount)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {metrics.openCount} {metrics.openCount === 1 ? 'posição em aberto' : 'posições em aberto'}
          </span>
        </div>

        {/* 2. Recuperado no mês */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Recuperado no mês
            </span>
            <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5 block">
              {formatCurrency(metrics.recoveredAmount)}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium mt-1">
            {metrics.recoveredCount} {metrics.recoveredCount === 1 ? 'posição recuperada' : 'posições recuperadas'}
          </span>
        </div>

        {/* 3. Aguardando pagamento */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Aguardando pagamento
            </span>
            <span className="font-display text-lg font-bold text-amber-600 dark:text-amber-400 tracking-tight mt-0.5 block">
              {formatCurrency(metrics.waitingPaymentAmount)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {metrics.waitingPaymentCount} {metrics.waitingPaymentCount === 1 ? 'posição nessa etapa' : 'posições nessa etapa'}
          </span>
        </div>

        {/* 4. Sem contato */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Sem contato
            </span>
            <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5 block">
              {formatCurrency(metrics.semContatoAmount)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {metrics.semContatoCount} {metrics.semContatoCount === 1 ? 'posição nessa etapa' : 'posições nessa etapa'}
          </span>
        </div>

        {/* 5. Progresso da meta */}
        <div className="bg-white dark:bg-slate-900/90 p-3 px-4 rounded-xl shadow-2xs border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between col-span-2 md:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Progresso da meta
            </span>
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
              {metrics.targetPercent}%
            </span>
          </div>
          <div className="mt-1">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-tight">
              {formatCurrency(metrics.recoveredAmount)}{' '}
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                / {formatCurrency(metrics.targetMonthly)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, metrics.targetPercent)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Board Kanban Horizontal Scroll */}
      <div className="w-full overflow-x-auto pb-8 custom-scrollbar">
        <div className="inline-flex gap-4 min-w-full items-start">
          {STAGES.map((stageKey) => {
            const config = STAGE_CONFIG[stageKey];
            const stageDeals = filteredDeals.filter((d) => d.status === stageKey);
            const stageTotal = stageDeals.reduce((sum, d) => sum + d.amount, 0);

            return (
              <section
                key={stageKey}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stageKey)}
                style={{ backgroundColor: `var(${STAGE_BG_VARS[stageKey]})` }}
                className="w-[330px] flex-shrink-0 flex flex-col gap-3 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 transition-colors"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-1.5 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2
                      className="font-display text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap"
                      title={config.label}
                    >
                      {config.label}
                    </h2>
                    <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center leading-none shrink-0 border border-transparent dark:border-slate-700/60">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-end shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-white/85 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight tabular-nums shadow-2xs">
                      {formatCurrency(stageTotal)}
                    </span>
                  </div>
                </div>

                {/* Column Cards List */}
                <div className="flex flex-col gap-2.5 min-h-[150px]">
                  {(() => {
                    // Group deals by debtor (document or clientName) in this stage
                    const stageGroups: ColumnDealGroup[] = [];
                    const groupMap = new Map<string, ColumnDealGroup>();

                    for (const deal of stageDeals) {
                      const debtorKey = (deal.document ? deal.document.replace(/\D/g, '') : '') || deal.clientName.trim().toUpperCase();
                      if (!groupMap.has(debtorKey)) {
                        const newGroup: ColumnDealGroup = {
                          groupKey: `${stageKey}_${debtorKey}`,
                          clientName: deal.clientName,
                          phone: deal.phone,
                          document: deal.document,
                          origin: deal.origin,
                          deals: []
                        };
                        groupMap.set(debtorKey, newGroup);
                        stageGroups.push(newGroup);
                      }
                      groupMap.get(debtorKey)!.deals.push(deal);
                    }

                    return stageGroups.map((group) => {
                      const isMultiple = group.deals.length > 1;
                      const groupDealIds = group.deals.map((d) => d.id);
                      const groupTotal = group.deals.reduce((sum, d) => sum + d.amount, 0);

                    // If single deal in this column for this client, render standard clean card
                    if (!isMultiple) {
                      const deal = group.deals[0];
                      const isDealMenuOpen = activeMenuId === deal.id || activeMenuId === `quick_${deal.id}` || menuAnchor?.id === deal.id;

                      return (
                        <article
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStartSingle(e, deal.id)}
                          onClick={() => onSelectDeal(deal)}
                          className={`group relative bg-white dark:bg-slate-900/90 p-3 rounded-xl shadow-2xs hover:shadow-md cursor-pointer transition-all duration-150 border border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 ${
                            isDealMenuOpen ? 'z-40 shadow-md ring-1 ring-indigo-500/20' : 'z-0 hover:z-10'
                          }`}
                        >
                          {/* Card Header: Client Name + Phone/WhatsApp + Quick Actions */}
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate">
                                {formatPersonName(deal.clientName)}
                              </h3>

                              {/* Telefone com WhatsApp inline e efeito no hover */}
                              <a
                                href={getWhatsAppLink(deal.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="group/phone inline-flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-all py-0.5 px-1 -ml-1 rounded hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <span className="tracking-tight">{deal.phone}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-all duration-150 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#25D366] text-white shadow-2xs group-hover/phone:scale-110 group-hover/phone:bg-[#20bd5a] shrink-0">
                                  <MessageCircle className="w-2.5 h-2.5 fill-white/30 text-white" strokeWidth={2.4} />
                                </span>
                              </a>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Three dots menu */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (menuAnchor?.id === deal.id) {
                                      setMenuAnchor(null);
                                      setActiveMenuId(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActiveMenuId(deal.id);
                                      setMenuAnchor({
                                        id: deal.id,
                                        rect,
                                        type: 'deal',
                                        deal
                                      });
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded w-5 h-5 flex items-center justify-center transition-opacity cursor-pointer"
                                  title="Mais opções"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Botão com balãozinho para listar atividades do cliente */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuAnchor(null);
                                  setActiveMenuId(null);
                                  setActivityPopover({
                                    id: deal.id,
                                    deals: [deal],
                                    anchorRect: rect,
                                    initialTab: 'history'
                                  });
                                }}
                                className={`group/btn inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                                  (deal.activities?.length || 0) > 0
                                    ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700'
                                    : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200/70 dark:border-slate-700/80'
                                }`}
                                title={
                                  (deal.activities?.length || 0) > 0
                                    ? `${deal.activities?.length} atividades registradas. Clique para ver a lista de atividades.`
                                    : '0 atividades registradas. Clique para ver ou registrar atividades.'
                                }
                              >
                                <MessageCircle
                                  className={`w-3 h-3 transition-colors ${
                                    (deal.activities?.length || 0) > 0
                                      ? 'text-indigo-600 dark:text-indigo-400 group-hover/btn:text-indigo-700 dark:group-hover/btn:text-indigo-300'
                                      : 'text-slate-400 dark:text-slate-500 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-300'
                                  }`}
                                />
                                <span className="tabular-nums font-mono text-[11px] leading-none">
                                  {deal.activities?.length || 0}
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Minimalist Footer: Responsável + Data (à esquerda), Tag centralizada e Valor em Destaque (à direita) */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                            {/* Left: Responsável primeiro + Data */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Operator Avatar */}
                              <div
                                className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${
                                  getOwnerAvatarColor(deal.owner, deal.ownerAvatar).badge
                                }`}
                                title={`Responsável: ${deal.owner}`}
                              >
                                {deal.ownerAvatar}
                              </div>

                              <span className="text-[11px] text-slate-400 font-normal">
                                {deal.competence}
                              </span>
                            </div>

                            {/* Center: Tag centralizada bem no meio entre a data e o valor */}
                            <div className="flex-1 flex justify-center px-1 min-w-0">
                              {deal.statusBadge ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTagModalDeal(deal);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate max-w-[130px] hover:scale-105 transition-transform cursor-pointer ${getTagBadgeClass(
                                    deal.statusBadge
                                  )}`}
                                  title="Clique para alterar ou remover etiqueta"
                                >
                                  {deal.statusBadge}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTagModalDeal(deal);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer flex items-center gap-1 font-medium"
                                  title="Adicionar etiqueta a este negócio"
                                >
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>+ Tag</span>
                                </button>
                              )}
                            </div>

                            {/* Right: Valor alinhado à direita */}
                            <span
                              className={`font-display font-bold text-sm tracking-tight shrink-0 ${
                                deal.status === 'quitado'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : deal.status === 'encerrado_sem_pagamento'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {formatCurrency(deal.amount)}
                            </span>
                          </div>
                        </article>
                      );
                    }

                    // Multiple titles grouped together: Clean minimalist layout
                    const isGroupMenuOpen = activeMenuId === group.groupKey || activeMenuId === `quick_${group.groupKey}` || menuAnchor?.id === group.groupKey;

                    return (
                      <article
                        key={group.groupKey}
                        className={`group relative bg-white dark:bg-slate-900/90 rounded-xl shadow-2xs hover:shadow-md transition-all duration-150 border border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 ${
                          isGroupMenuOpen ? 'z-40 shadow-md ring-1 ring-indigo-500/20' : 'z-0 hover:z-10'
                        }`}
                      >
                        {/* Header: Cliente e Telefone (arrastável lá em cima para carregar todos os títulos juntos e clicável para abrir o primeiro negócio) */}
                        <div
                          draggable
                          onDragStart={(e) => handleDragStartGroup(e, groupDealIds)}
                          onClick={() => onSelectDeal(group.deals[0])}
                          className="p-3 pb-2.5 bg-white dark:bg-slate-900/95 rounded-t-xl border-b border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          title="Clique para abrir os detalhes deste cliente ou arraste para mover todos os títulos juntos"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate">
                                  {formatPersonName(group.clientName)}
                                </h3>
                              </div>

                              {/* Telefone com WhatsApp inline e efeito no hover */}
                              <a
                                href={getWhatsAppLink(group.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="group/phone inline-flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-all py-0.5 px-1 -ml-1 rounded hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <span className="tracking-tight">{group.phone}</span>
                                <span className="opacity-0 group-hover/phone:opacity-100 transition-all duration-150 inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#25D366] text-white shadow-2xs group-hover/phone:scale-110 group-hover/phone:bg-[#20bd5a] shrink-0">
                                  <MessageCircle className="w-2.5 h-2.5 fill-white/30 text-white" strokeWidth={2.4} />
                                </span>
                              </a>
                            </div>

                            {/* Header Right: Menu Principal de 3 Pontos (no topo) e Atividades Rápidas (abaixo) */}
                            <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {/* Three-dots Menu Principal do Card (para o cliente / todos os títulos) */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (menuAnchor?.id === group.groupKey) {
                                      setMenuAnchor(null);
                                      setActiveMenuId(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setActiveMenuId(group.groupKey);
                                      setMenuAnchor({
                                        id: group.groupKey,
                                        rect,
                                        type: 'group',
                                        group
                                      });
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded w-5 h-5 flex items-center justify-center transition-opacity cursor-pointer"
                                  title="Opções deste cliente"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Botão com balãozinho para listar atividades do grupo */}
                              {(() => {
                                const totalGroupActivities = getConsolidatedActivitiesCount(group.deals);
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuAnchor(null);
                                      setActiveMenuId(null);
                                      setActivityPopover({
                                        id: group.groupKey,
                                        deals: group.deals,
                                        anchorRect: rect,
                                        initialTab: 'history'
                                      });
                                    }}
                                    className={`group/btn inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer shadow-2xs select-none ${
                                      totalGroupActivities > 0
                                        ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700'
                                        : 'bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200/70 dark:border-slate-700/80'
                                    }`}
                                    title={
                                      totalGroupActivities > 0
                                        ? `${totalGroupActivities} atividades registradas neste cliente. Clique para ver a lista de atividades.`
                                        : '0 atividades registradas. Clique para ver ou registrar atividades.'
                                    }
                                  >
                                    <MessageCircle
                                      className={`w-3 h-3 transition-colors ${
                                        totalGroupActivities > 0
                                          ? 'text-indigo-600 dark:text-indigo-400 group-hover/btn:text-indigo-700 dark:group-hover/btn:text-indigo-300'
                                          : 'text-slate-400 dark:text-slate-500 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-300'
                                      }`}
                                    />
                                    <span className="tabular-nums font-mono text-[11px] leading-none">
                                      {totalGroupActivities}
                                    </span>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Title Extensions Stack: Linhas individuais clicáveis e arrastáveis */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900/90">
                          {group.deals.map((deal) => {
                            return (
                              <div
                                key={deal.id}
                                draggable
                                onDragStart={(e) => handleDragStartSingle(e, deal.id)}
                                onClick={() => onSelectDeal(deal)}
                                className="p-2.5 transition-all relative hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-grab active:cursor-grabbing group/item"
                                title="Arraste esta linha para mover somente este título para outra fila"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  {/* Left: Responsável + Data (Competência) */}
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {/* Operator Avatar */}
                                    <div
                                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${
                                        getOwnerAvatarColor(deal.owner, deal.ownerAvatar).badge
                                      }`}
                                      title={`Responsável: ${deal.owner}`}
                                    >
                                      {deal.ownerAvatar}
                                    </div>

                                    <span className="text-[11px] text-slate-400 font-normal">
                                      {deal.competence}
                                    </span>
                                  </div>

                                  {/* Center: Tag ou Botão para adicionar tag para este negócio */}
                                  <div className="flex-1 flex justify-center px-1 min-w-0">
                                    {deal.statusBadge ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTagModalDeal(deal);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border truncate max-w-[120px] hover:scale-105 transition-transform cursor-pointer ${getTagBadgeClass(
                                          deal.statusBadge
                                        )}`}
                                        title="Clique para alterar ou remover etiqueta"
                                      >
                                        {deal.statusBadge}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTagModalDeal(deal);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 group-hover/item:opacity-100 transition-opacity text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer flex items-center gap-1 font-medium select-none"
                                        title="Adicionar etiqueta a este negócio"
                                      >
                                        <Tag className="w-2.5 h-2.5" />
                                        <span>+ Tag</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Right: Valor em destaque alinhado à direita */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`font-display font-semibold text-xs tracking-tight transition-colors ${
                                        deal.status === 'quitado'
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : deal.status === 'encerrado_sem_pagamento'
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-slate-900 dark:text-slate-100 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400'
                                      }`}
                                    >
                                      {formatCurrency(deal.amount)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer Minimalista: Total em Aberto com contagem na base do card agrupado */}
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 dark:bg-slate-900/95 border-t border-slate-100 dark:border-slate-800/80 text-[11px] rounded-b-xl">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">
                              Total em aberto
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                              {group.deals.length}
                            </span>
                          </div>
                          <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
                            {formatCurrency(groupTotal)}
                          </span>
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Menu dropdown flutuante de 3 pontos renderizado via Portal para nunca ser cortado pelo scroll ou limites do card */}
      {menuAnchor &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: calculateMenuCoords(menuAnchor.rect, 200, 310).left,
              top: calculateMenuCoords(menuAnchor.rect, 200, 310).top,
              bottom: calculateMenuCoords(menuAnchor.rect, 200, 310).bottom,
              zIndex: 9999
            }}
            className="w-48 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-800 py-1 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/10 dark:ring-black/40 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
          >
            {menuAnchor.type === 'deal' && menuAnchor.deal && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDeal(menuAnchor.deal!);
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Abrir detalhes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const anchor = menuAnchor;
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                    setActivityPopover({
                      id: anchor.deal!.id,
                      deals: [anchor.deal!],
                      anchorRect: anchor.rect,
                      initialTab: 'quick_create'
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Registrar atividade rápida</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setTagModalDeal(menuAnchor.deal!);
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{menuAnchor.deal.statusBadge ? 'Alterar etiqueta' : 'Adicionar etiqueta'}</span>
                </button>
                {menuAnchor.deal.statusBadge && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSetDealTag(menuAnchor.deal!, undefined);
                      setMenuAnchor(null);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover etiqueta</span>
                  </button>
                )}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Mover para etapa
                </div>
                {(
                  [
                    'nova_posicao',
                    'contato_em_andamento',
                    'em_negociacao',
                    'aguardando_pagamento',
                    'encerrado_sem_pagamento',
                    'quitado'
                  ] as DealStage[]
                ).map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => {
                      onUpdateDealStage(menuAnchor.deal!.id, stg);
                      setMenuAnchor(null);
                      setActiveMenuId(null);
                    }}
                    className={`w-full text-left px-3 py-1 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between cursor-pointer ${
                      menuAnchor.deal!.status === stg
                        ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{STAGE_CONFIG[stg]?.label || stg}</span>
                    {menuAnchor.deal!.status === stg && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </button>
                ))}
              </>
            )}

            {menuAnchor.type === 'group' && menuAnchor.group && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDeal(menuAnchor.group!.deals[0]);
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Abrir detalhes</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const anchor = menuAnchor;
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                    setActivityPopover({
                      id: anchor.group!.groupKey,
                      deals: anchor.group!.deals,
                      anchorRect: anchor.rect,
                      initialTab: 'quick_create'
                    });
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Registrar atividade rápida</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setTagModalDeal(menuAnchor.group!.deals[0]);
                    setMenuAnchor(null);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/50 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-medium cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{menuAnchor.group.deals[0].statusBadge ? 'Alterar etiqueta' : 'Adicionar etiqueta'}</span>
                </button>
                {menuAnchor.group.deals[0].statusBadge && (
                  <button
                    type="button"
                    onClick={() => {
                      handleSetDealTag(menuAnchor.group!.deals[0], undefined);
                      setMenuAnchor(null);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remover etiqueta</span>
                  </button>
                )}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  Mover todos ({menuAnchor.group.deals.length}) para
                </div>
                {(
                  [
                    'nova_posicao',
                    'contato_em_andamento',
                    'em_negociacao',
                    'aguardando_pagamento',
                    'encerrado_sem_pagamento',
                    'quitado'
                  ] as DealStage[]
                ).map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => {
                      const ids = menuAnchor.group!.deals.map((d) => d.id);
                      onUpdateDealStage(ids, stg);
                      setMenuAnchor(null);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-3 py-1 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center justify-between text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <span>{STAGE_CONFIG[stg]?.label || stg}</span>
                  </button>
                ))}
              </>
            )}
          </div>,
          document.body
        )}

      {/* Frame / Popover de Atividades e Registro Rápido */}
      {activityPopover && (
        <QuickActivityMenu
          deals={
            deals.filter((d) => activityPopover.deals.some((target) => target.id === d.id)).length > 0
              ? deals.filter((d) => activityPopover.deals.some((target) => target.id === d.id))
              : activityPopover.deals
          }
          anchorRect={activityPopover.anchorRect}
          initialTab={activityPopover.initialTab}
          isOpen={true}
          onClose={() => {
            setActivityPopover(null);
            setMenuAnchor(null);
            setActiveMenuId(null);
          }}
          onAddActivity={(newAct) => handleAddQuickActivity(activityPopover.deals, newAct)}
          onOpenDetails={() => {
            const targetDeal = activityPopover.deals[0];
            setActivityPopover(null);
            setMenuAnchor(null);
            setActiveMenuId(null);
            if (targetDeal) {
              const freshDeal = deals.find((d) => d.id === targetDeal.id) || targetDeal;
              onSelectDeal(freshDeal, 'atividades', true);
            }
          }}
          onOpenManagerDrawer={() => {
            setIsQuickActivitiesDrawerOpen(true);
            setActivityPopover(null);
            setMenuAnchor(null);
            setActiveMenuId(null);
          }}
        />
      )}

      {/* Modal para Selecionar, Criar e Gerenciar Etiquetas */}
      <TagPickerModal
        isOpen={!!tagModalDeal}
        onClose={() => setTagModalDeal(null)}
        currentTag={tagModalDeal?.statusBadge}
        clientName={tagModalDeal ? formatPersonName(tagModalDeal.clientName) : undefined}
        onSelectTag={(newTag) => {
          if (tagModalDeal) {
            handleSetDealTag(tagModalDeal, newTag);
          }
        }}
      />

      {/* Drawer Lateral de Gerenciamento e Cadastro de Atividades Rápidas */}
      <QuickActivitiesDrawer
        isOpen={isQuickActivitiesDrawerOpen}
        onClose={() => setIsQuickActivitiesDrawerOpen(false)}
      />
    </div>
  );
};
