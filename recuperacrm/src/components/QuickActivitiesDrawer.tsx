import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  Check,
  Zap,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import {
  QuickActivityTemplate,
  useQuickActivityTemplates
} from '../quickActivityTemplates';
import {
  getActivityStyle,
  ACTIVITY_CHANNEL_STYLES
} from '../activityStyles';

interface QuickActivitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActivitiesDrawer: React.FC<QuickActivitiesDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const { templates, addTemplate, deleteTemplate, resetToDefaults } =
    useQuickActivityTemplates();

  // Collapsible state: form starts closed for a clean, scannable first impression
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Form states for new template
  const [channel, setChannel] = useState<'whatsapp' | 'call' | 'payment' | 'note'>('whatsapp');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState<string>('all');

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    const channelMap = {
      whatsapp: 'WhatsApp',
      call: 'Ligação',
      payment: 'Pagamento',
      note: 'Anotação'
    };

    const cleanDesc = description.trim() || cleanTitle;
    const channelLabel = channelMap[channel];

    addTemplate({
      channel,
      channelLabel,
      title: cleanTitle,
      description: cleanDesc
    });

    showNotification(`Modelo "${cleanTitle}" cadastrado com sucesso!`);
    setTitle('');
    setDescription('');
    setIsFormOpen(false);
  };

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesChannel = filterChannel === 'all' || tpl.channel === filterChannel;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      tpl.title.toLowerCase().includes(query) ||
      tpl.description.toLowerCase().includes(query) ||
      tpl.channelLabel.toLowerCase().includes(query);
    return matchesChannel && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Panel */}
      <aside
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20 shrink-0">
              <Zap className="w-4.5 h-4.5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Atividades Rápidas
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  {templates.length} atalhos
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Modelos prontos exibidos no menu dos cards para registro em 1 clique.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar gaveta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert if any */}
        {feedbackMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shrink-0">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="flex-1">{feedbackMsg}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar overscroll-contain">
          {/* 1. SEÇÃO EXPANSÍVEL: CADASTRAR NOVO MODELO */}
          {!isFormOpen ? (
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    Cadastrar Novo Atalho Rápido
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Crie ações automáticas com mensagens e canais personalizados
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </span>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-indigo-800/80 flex flex-col gap-3.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                    Novo Atalho Rápido
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>

              <form onSubmit={handleCreateTemplate} className="flex flex-col gap-3">
                {/* Seleção do Canal */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Canal de Atendimento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'whatsapp', style: ACTIVITY_CHANNEL_STYLES.whatsapp },
                      { id: 'call', style: ACTIVITY_CHANNEL_STYLES.call },
                      { id: 'payment', style: ACTIVITY_CHANNEL_STYLES.payment },
                      { id: 'note', style: ACTIVITY_CHANNEL_STYLES.note }
                    ].map(({ id, style }) => {
                      const isSelected = channel === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setChannel(id as any)}
                          className={`py-1.5 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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

                {/* Título / Ação */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Título do Atalho *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Mensagem de aviso pré-negativação enviada"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Descrição / Texto padrão (opcional) */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Descrição / Texto Registrado
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      (opcional)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Enviado comunicado formal via WhatsApp com memorial atualizado."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Botões do Formulário */}
                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!title.trim()}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salvar Atalho</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. BARRA DE BUSCA E FILTROS */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Atalhos Disponíveis ({filteredTemplates.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Clique em um atalho para ver detalhes
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar atalho..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0">
                {[
                  { id: 'all', label: 'Todos', style: null },
                  { id: 'whatsapp', label: 'WhatsApp', style: ACTIVITY_CHANNEL_STYLES.whatsapp },
                  { id: 'call', label: 'Ligação', style: ACTIVITY_CHANNEL_STYLES.call },
                  { id: 'payment', label: 'Pagamento', style: ACTIVITY_CHANNEL_STYLES.payment },
                  { id: 'note', label: 'Anotação', style: ACTIVITY_CHANNEL_STYLES.note }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterChannel(f.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      filterChannel === f.id
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f.style && f.style.icon(`w-3 h-3 shrink-0 ${filterChannel === f.id ? 'text-white' : f.style.iconColor}`)}
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. LISTA DE MODELOS (LIMPA E EXPANSÍVEL) */}
          <div className="flex flex-col gap-2">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((tpl) => {
                const style = getActivityStyle(tpl.channel);
                const isExpanded = expandedTemplateId === tpl.id;
                const hasDescription = Boolean(tpl.description && tpl.description !== tpl.title);

                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border transition-all ${
                      isExpanded
                        ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs'
                        : 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Item Row Header */}
                    <div
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer select-none"
                      onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${style.iconBox}`}
                          title={style.label}
                        >
                          {style.icon('w-3.5 h-3.5 shrink-0 text-white')}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                              {tpl.title}
                            </h5>
                            <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded shadow-2xs ${style.badgeClasses}`}>
                              {style.label}
                            </span>
                            {tpl.isCustom && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                                Personalizado
                              </span>
                            )}
                          </div>

                          {!isExpanded && hasDescription && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {tpl.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right actions: Expand trigger & Delete */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setExpandedTemplateId(isExpanded ? null : tpl.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          title={isExpanded ? 'Recolher detalhes' : 'Ver mensagem registrada'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Tem certeza que deseja excluir o modelo "${tpl.title}"?`
                              )
                            ) {
                              deleteTemplate(tpl.id);
                              showNotification(`Modelo "${tpl.title}" excluído.`);
                            }
                          }}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer"
                          title="Excluir este modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2 text-xs animate-in fade-in duration-150">
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                            Texto registrado no card e timeline:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {tpl.description || tpl.title}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10.5px] text-slate-400">
                          <span>Canal: <strong className="text-slate-600 dark:text-slate-300">{style.label}</strong></span>
                          <span>Disponível no menu de 1 clique de todos os cards</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhum atalho encontrado
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs">
                  {searchQuery
                    ? 'Nenhum resultado para os termos da busca.'
                    : 'Não há atalhos cadastrados para este canal. Clique em "Cadastrar Novo Atalho Rápido" acima para adicionar.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Deseja restaurar os modelos de atividades para o padrão inicial do sistema?')) {
                resetToDefaults();
                showNotification('Modelos restaurados para o padrão do sistema.');
              }
            }}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Restaurar modelos de fábrica"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </aside>
    </div>
  );
};
