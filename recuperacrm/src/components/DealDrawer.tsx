import React, { useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Calendar,
  Building,
  User,
  Plus,
  CheckCircle2,
  Clock,
  Tag as TagIcon,
  Copy,
  Check,
  Trash2
} from 'lucide-react';
import { Deal, DealStage, Activity, HistoryEvent, HistoryEventType } from '../types';
import { formatCurrency, getWhatsAppLink, generateId, getOwnerAvatarColor, formatPersonName } from '../utils';
import { STAGE_CONFIG } from '../mockData';
import { getTagBadgeClass } from '../tagUtils';
import { TagPickerModal } from './TagPickerModal';
import { getActivityStyle, ACTIVITY_CHANNEL_STYLES } from '../activityStyles';
import { DealHistoryTimeline } from './DealHistoryTimeline';
import { getDealHistory, formatDateTimeBR } from '../historyUtils';

export type DrawerTab = 'geral' | 'atividades' | 'historico';

interface DealDrawerProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDeal: (updatedDeal: Deal) => void;
  onDeleteDeal: (dealId: string) => void;
  initialTab?: DrawerTab;
  initialExpandActivityForm?: boolean;
}

export const DealDrawer: React.FC<DealDrawerProps> = ({
  deal,
  isOpen,
  onClose,
  onUpdateDeal,
  onDeleteDeal,
  initialTab = 'geral',
  initialExpandActivityForm = false
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>(initialTab);
  const activityTitleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialExpandActivityForm) {
        setActiveTab('atividades');
        setShowAddActivityForm(true);
      } else if (initialTab) {
        setActiveTab(initialTab);
      } else {
        setActiveTab('geral');
      }
    }
  }, [isOpen, initialTab, initialExpandActivityForm, deal?.id]);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  const [showAddActivityForm, setShowAddActivityForm] = useState(false);
  const [activityType, setActivityType] = useState<Activity['type']>('whatsapp');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');

  React.useEffect(() => {
    if (isOpen && showAddActivityForm && activeTab === 'atividades') {
      const timer = setTimeout(() => {
        activityTitleInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showAddActivityForm, activeTab]);

  const handleUpdateTag = (tagName: string | undefined) => {
    if (!deal) return;
    const updated: Deal = {
      ...deal,
      statusBadge: tagName,
      updatedAt: new Date().toISOString()
    };
    onUpdateDeal(updated);
  };

  if (!isOpen || !deal) return null;

  const stage = STAGE_CONFIG[deal.status] || STAGE_CONFIG.novo;
  const historyEvents = getDealHistory(deal);

  const handleOwnerChange = (newOwner: string) => {
    if (newOwner === deal.owner) return;
    const prevOwner = deal.owner;
    const currentHistory = getDealHistory(deal);
    const newHistoryEvent: HistoryEvent = {
      id: generateId(),
      type: 'owner_change',
      title: 'Alteração de responsável',
      actor: deal.owner || 'Helena',
      timestamp: formatDateTimeBR(new Date()),
      description: `${prevOwner} → ${newOwner}`,
      details: { fromOwner: prevOwner, toOwner: newOwner }
    };

    const updated: Deal = {
      ...deal,
      owner: newOwner,
      ownerAvatar: newOwner.charAt(0).toUpperCase(),
      updatedAt: new Date().toISOString(),
      history: [...currentHistory, newHistoryEvent]
    };
    onUpdateDeal(updated);
  };

  const handleStageChange = (newStage: DealStage) => {
    if (newStage === deal.status) return;
    const prevStage = deal.status;
    const prevLabel = STAGE_CONFIG[prevStage]?.label || prevStage;
    const newLabel = STAGE_CONFIG[newStage]?.label || newStage;

    const isClosed = newStage === 'quitado' || newStage === 'encerrado_sem_pagamento';
    const eventType: HistoryEventType = isClosed ? 'status_closed' : 'stage_change';
    const eventTitle =
      newStage === 'quitado'
        ? 'Negócio quitado'
        : newStage === 'encerrado_sem_pagamento'
        ? 'Negócio encerrado'
        : 'Mudança de etapa';
    const eventDesc = isClosed
      ? `Etapa final: ${newLabel}`
      : `${prevLabel} → ${newLabel}`;

    const currentHistory = getDealHistory(deal);
    const newHistoryEvent: HistoryEvent = {
      id: generateId(),
      type: eventType,
      title: eventTitle,
      actor: deal.owner || 'Helena',
      timestamp: formatDateTimeBR(new Date()),
      description: eventDesc,
      details: { fromStage: prevStage, toStage: newStage }
    };

    const updated: Deal = {
      ...deal,
      status: newStage,
      updatedAt: new Date().toISOString(),
      history: [...currentHistory, newHistoryEvent]
    };
    onUpdateDeal(updated);
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    const nowStr = formatDateTimeBR(new Date());
    const newAct: Activity = {
      id: generateId(),
      type: activityType,
      title: activityTitle.trim(),
      description: activityDescription.trim() || 'Atividade registrada pelo operador.',
      author: deal.owner || 'Helena',
      timestamp: nowStr
    };

    const currentHistory = getDealHistory(deal);
    const newHistoryEvent: HistoryEvent = {
      id: generateId(),
      type: 'activity_added',
      title: 'Atividade registrada',
      actor: newAct.author,
      timestamp: nowStr,
      description: newAct.title,
      details: { activityType: newAct.type }
    };

    const updated: Deal = {
      ...deal,
      commentCount: (deal.activities?.length || 0) + 1,
      activities: [newAct, ...(deal.activities || [])],
      history: [...currentHistory, newHistoryEvent],
      updatedAt: new Date().toISOString()
    };

    onUpdateDeal(updated);
    setActivityTitle('');
    setActivityDescription('');
    setShowAddActivityForm(false);
  };

  const handleRemoveActivity = (actId: string) => {
    const targetAct = deal.activities?.find((a) => a.id === actId);
    if (!targetAct) return;

    const nowStr = formatDateTimeBR(new Date());
    const currentHistory = getDealHistory(deal);
    const newHistoryEvent: HistoryEvent = {
      id: generateId(),
      type: 'activity_removed',
      title: 'Atividade removida',
      actor: deal.owner || 'Helena',
      timestamp: nowStr,
      description: targetAct.title,
      details: { activityType: targetAct.type }
    };

    const updated: Deal = {
      ...deal,
      commentCount: Math.max(0, (deal.activities?.length || 1) - 1),
      activities: (deal.activities || []).filter((a) => a.id !== actId),
      history: [...currentHistory, newHistoryEvent],
      updatedAt: new Date().toISOString()
    };

    onUpdateDeal(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer content panel */}
      <aside
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stage.badgeClass}`}
                >
                  {stage.label}
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
                {formatPersonName(deal.clientName)}
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
                {formatCurrency(deal.amount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={getWhatsAppLink(
                  deal.phone,
                  `Olá ${formatPersonName(deal.clientName)}, sou da equipe Progrid+ referente ao contrato #${deal.reference}. Podemos conversar sobre a regularização de seu débito?`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
                <span>WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  setShowAddActivityForm(true);
                  setActiveTab('atividades');
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
                {deal.activities?.length || 0}
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
                {historyEvents.length}
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {/* TAB 1: GERAL / RESUMO & OBSERVAÇÕES */}
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
                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Telefone Principal</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{deal.phone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(deal.phone, 'phone')}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          copiedKey === 'phone'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                        }`}
                        title={copiedKey === 'phone' ? 'Copiado!' : 'Copiar telefone'}
                      >
                        {copiedKey === 'phone' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Documento (CPF/CNPJ)</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                        {deal.document}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(deal.document, 'document')}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          copiedKey === 'document'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                        }`}
                        title={copiedKey === 'document' ? 'Copiado!' : 'Copiar documento'}
                      >
                        {copiedKey === 'document' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Contrato / Ref</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {deal.contractNumber ? `#${deal.contractNumber}` : `#${deal.reference}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            deal.contractNumber || deal.reference,
                            'reference'
                          )
                        }
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          copiedKey === 'reference'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                        }`}
                        title={copiedKey === 'reference' ? 'Copiado!' : 'Copiar referência'}
                      >
                        {copiedKey === 'reference' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {deal.reason && (
                    <div className="flex flex-col">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Motivo da Recusa</span>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/60 mt-0.5 w-fit">
                        {deal.reason}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Competência</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {deal.competence}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Origem</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={deal.origin}>
                      {deal.origin}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Responsável Atual</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 ${
                          getOwnerAvatarColor(deal.owner, deal.ownerAvatar).badge
                        }`}
                      >
                        {deal.ownerAvatar}
                      </div>
                      <select
                        value={deal.owner}
                        onChange={(e) => handleOwnerChange(e.target.value)}
                        className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 cursor-pointer"
                        title="Alterar responsável (registra no histórico)"
                      >
                        <option value="Helena">Helena</option>
                        <option value="Ymalaia">Ymalaia</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Mudar Etapa do Pipeline</span>
                    <select
                      value={deal.status}
                      onChange={(e) => handleStageChange(e.target.value as DealStage)}
                      className="mt-0.5 text-xs font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="nova_posicao">Nova posição</option>
                      <option value="contato_em_andamento">Contato em andamento</option>
                      <option value="em_negociacao">Em negociação</option>
                      <option value="aguardando_pagamento">Aguardando pagamento</option>
                      <option value="encerrado_sem_pagamento">Encerrado sem pagamento</option>
                      <option value="quitado">Quitado</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: REGISTRO DE ATIVIDADES */}
          {activeTab === 'atividades' && (
            <div className="flex flex-col gap-4">
              {/* Add Activity Button/Form */}
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
                <form
                  onSubmit={handleAddActivity}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3 dark:bg-[#101624] dark:border-slate-800"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      Nova Interação / Atividade
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddActivityForm(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Seleção rápida de canais de atendimento */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Canal / Tipo de Contato
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: 'whatsapp', style: ACTIVITY_CHANNEL_STYLES.whatsapp },
                        { id: 'call', style: ACTIVITY_CHANNEL_STYLES.call },
                        { id: 'payment', style: ACTIVITY_CHANNEL_STYLES.payment },
                        { id: 'note', style: ACTIVITY_CHANNEL_STYLES.note }
                      ].map(({ id, style }) => {
                        const isSelected = activityType === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setActivityType(id as Activity['type'])}
                            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
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

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Título da Atividade *
                    </label>
                    <input
                      ref={activityTitleInputRef}
                      type="text"
                      required
                      placeholder="Ex: Acordo aceito em 2x"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 dark:bg-[#0b0f19] dark:border-slate-700 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Detalhamento do contato
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Descreva o que foi acordado com o devedor..."
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 dark:bg-[#0b0f19] dark:border-slate-700 dark:text-slate-100 resize-none outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddActivityForm(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                    >
                      Registrar
                    </button>
                  </div>
                </form>
              )}

              {/* Timeline feed */}
              {deal.activities && deal.activities.length > 0 ? (
                <div className="relative pl-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 flex flex-col gap-4">
                  {deal.activities.map((act) => {
                    const style = getActivityStyle(act.type);
                    return (
                      <div key={act.id} className="relative flex flex-col gap-1">
                        {/* Circle icon with channel-specific color and icon */}
                        <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-xs ${style.timelineBg}`}>
                          {style.icon('w-3 h-3 text-white')}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-md shadow-2xs shrink-0 ${style.badgeClasses}`}>
                              {style.icon('w-2.5 h-2.5 shrink-0 text-white')}
                              <span>{style.label}</span>
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{act.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{act.timestamp}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveActivity(act.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer dark:hover:bg-rose-950/40"
                              title="Remover atividade (registra no histórico)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-0.5">{act.description}</p>

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 pl-0.5">
                          Registrado por: {act.author}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                    <MessageCircle className="w-5 h-5" />
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
              )}
            </div>
          )}

          {/* TAB 3: HISTÓRICO COMPLETO DO NEGÓCIO */}
          {activeTab === 'historico' && (
            <div className="flex flex-col gap-4">
              <DealHistoryTimeline events={historyEvents} />
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end dark:bg-[#101624] dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer dark:bg-[#151d2e] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#1c263c]"
          >
            Fechar
          </button>
        </div>
      </aside>
    </div>
  );
};
