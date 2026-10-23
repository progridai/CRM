import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, Phone, MessageCircle, MessageSquare, Plus, FileText, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { listarAtividades, registrarAtividade, type AtividadeDto, type EtapaDto, type NegocioDto } from '../../services/negociosService';
import { useQuickActivityTemplates } from '../../hooks/useQuickActivityTemplates';
import { getNameInitial, getWhatsAppLink } from '../../utils';
import type { NegociosSort } from '../../types';

interface KanbanBoardProps {
  etapas: EtapaDto[];
  negocios: NegocioDto[];
  onCardClick: (negocio: NegocioDto) => void;
  onDropCard: (negocioPublicId: string, novaEtapaCodigo: string) => void;
  onOpenQuickActivitiesManager: () => void;
  onAtividadeRegistrada?: () => void;
  sortMode: NegociosSort;
}

type ActivityType = 'whatsapp' | 'ligacao' | 'pagamento' | 'anotacao';
const ALL_GROUP_DEALS = '__all_group_deals__';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ etapas, negocios, onCardClick, onDropCard, onOpenQuickActivitiesManager, onAtividadeRegistrada, sortMode }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupAtividades, setGroupAtividades] = useState<AtividadeDto[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [panelMode, setPanelMode] = useState<'history' | 'menu' | 'create' | 'quick'>('history');
  const [selectedNegocioId, setSelectedNegocioId] = useState<string | null>(null);
  const [submittingAtividade, setSubmittingAtividade] = useState(false);
  const [submittingShortcutId, setSubmittingShortcutId] = useState<string | null>(null);
  const [newActivityType, setNewActivityType] = useState<ActivityType>('whatsapp');
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [activityError, setActivityError] = useState<string | null>(null);
  const activityPanelRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState({ previous: false, next: false });

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const updateNavigation = () => {
      const previous = board.scrollLeft > 1;
      const next = board.scrollLeft + board.clientWidth < board.scrollWidth - 1;
      setNavigation(current => current.previous === previous && current.next === next
        ? current : { previous, next });
    };
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(board);
    if (board.firstElementChild) observer.observe(board.firstElementChild);
    board.addEventListener('scroll', updateNavigation, { passive: true });
    updateNavigation();
    return () => {
      observer.disconnect();
      board.removeEventListener('scroll', updateNavigation);
    };
  }, [etapas.length]);

  const navigateColumns = (direction: number) => {
    setOpenGroup(null);
    const board = boardRef.current;
    if (!board) return;
    const column = board.firstElementChild?.firstElementChild;
    const step = column?.getBoundingClientRect().width || 346;
    board.scrollBy({
      left: direction * step,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const [panelAnchor, setPanelAnchor] = useState({ x: 0, y: 0 });

  const anchorAtClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPanelAnchor(event.detail === 0
      ? { x: rect.right, y: rect.top }
      : { x: event.clientX, y: event.clientY });
  };

  const keepPanelPosition = () => {
    const rect = activityPanelRef.current?.getBoundingClientRect();
    if (rect) setPanelAnchor({ x: rect.left, y: rect.top });
  };

  useLayoutEffect(() => {
    const panel = activityPanelRef.current;
    if (!openGroup || !panel) return;

    const positionPanel = () => {
      const margin = 12;
      panel.style.maxHeight = `${Math.min(500, window.innerHeight - margin * 2)}px`;
      const { width, height } = panel.getBoundingClientRect();
      // Prefer the click position; shift only as far as necessary to stay on screen.
      panel.style.left = `${Math.max(margin, Math.min(panelAnchor.x, window.innerWidth - width - margin))}px`;
      panel.style.top = `${Math.max(margin, Math.min(panelAnchor.y, window.innerHeight - height - margin))}px`;
    };

    positionPanel();
    const observer = new ResizeObserver(positionPanel);
    observer.observe(panel);
    window.addEventListener('resize', positionPanel);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionPanel);
    };
  }, [openGroup, panelMode, panelAnchor]);

  const { templates: shortcuts, loading: loadingShortcuts } = useQuickActivityTemplates();

  useEffect(() => {
    if (!openGroup) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (activityPanelRef.current?.contains(target) || target.closest('[data-activity-trigger]')) return;
      setOpenGroup(null);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroup(null);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openGroup]);

  const handleOpenActivitiesPanel = async (
    e: React.MouseEvent,
    chave: string,
    idsStr: string,
    mode: 'history' | 'menu'
  ) => {
    e.stopPropagation();
    if (openGroup === chave && panelMode === mode) {
      setOpenGroup(null);
      return;
    }

    anchorAtClick(e);
    setOpenGroup(chave);
    setPanelMode(mode);

    const ids = idsStr.split(',');
    setSelectedNegocioId(ids.length === 1 ? ids[0] : null);

    if (mode === 'menu') {
      setNewActivityType('whatsapp');
      setNewActivityTitle('');
      setNewActivityDescription('');
      setActivityError(null);
      setSubmittingShortcutId(null);
      return;
    }

    setGroupAtividades([]);
    setLoadingAtividades(true);
    try {
      const data = await listarAtividades(ids);
      setGroupAtividades(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const handleCreateActivity = async (
    tipo: string,
    titulo: string,
    descricao: string,
    targetNegocioIds?: string[],
  ) => {
    const negocioIds = targetNegocioIds
      ?? (selectedNegocioId && selectedNegocioId !== ALL_GROUP_DEALS ? [selectedNegocioId] : []);

    if (negocioIds.length === 0) {
      setActivityError('Selecione o negócio em que a atividade será registrada.');
      return;
    }
    try {
      setSubmittingAtividade(true);
      setActivityError(null);
      await Promise.all(
        negocioIds.map((negocioId) =>
          registrarAtividade(negocioId, { tipo, titulo, descricao }),
        ),
      );

      setNewActivityTitle('');
      setNewActivityDescription('');
      setOpenGroup(null);

      onAtividadeRegistrada?.();
    } catch (err) {
      console.error('Erro ao registrar atividade', err);
      setActivityError('Não foi possível registrar a atividade. Tente novamente.');
    } finally {
      setSubmittingAtividade(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, payload: string) => {
    e.dataTransfer.setData('text/plain', payload);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, etapaCodigo: string) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData('text/plain');
    if (payload) {
      const ids = payload.split(',');
      ids.forEach(id => {
        if (id.trim()) {
          onDropCard(id.trim(), etapaCodigo);
        }
      });
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <nav aria-label="Navegação das colunas do Kanban" className="mb-3 flex items-center justify-end gap-2">
        <span className="mr-1 text-xs text-slate-500 dark:text-slate-400">Navegar pelas etapas</span>
        <button type="button" onClick={() => navigateColumns(-1)} disabled={!navigation.previous}
          aria-label="Ver colunas anteriores" title="Colunas anteriores" aria-controls="kanban-columns"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => navigateColumns(1)} disabled={!navigation.next}
          aria-label="Ver próximas colunas" title="Próximas colunas" aria-controls="kanban-columns"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default disabled:opacity-30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    <div ref={boardRef} id="kanban-columns" tabIndex={0} aria-label="Colunas do Kanban" className="flex-1 overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
      <div className="-mx-2 flex min-h-[500px] items-stretch pb-4">
        {etapas.map((etapa) => {
          // Filtra negócios desta etapa
          const negociosEtapa = negocios.filter((n) => n.etapaCodigo === etapa.codigo);
          const totalValor = negociosEtapa.reduce((acc, n) => acc + n.valor, 0);

          // Fallback para cor_hex vazio
          const color = etapa.corHex || '#94a3b8';
          
          // Adiciona opacidade de ~8% via hexadecimal (ex: #6366f1 -> #6366f115)
          const fallbackBgColor = color + '15';

          return (
            <div
              key={etapa.codigo}
              className="w-[346px] flex-shrink-0 self-stretch px-2"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa.codigo)}
              aria-label={`Área de destino da etapa ${etapa.nome}`}
            >
              <section
                style={{ backgroundColor: `var(--kanban-${etapa.codigo}-bg, ${fallbackBgColor})` }}
                className="flex w-full flex-col gap-3 rounded-2xl border border-slate-200/60 p-2 transition-colors dark:border-slate-800/80"
              >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2
                    className="font-display text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight whitespace-nowrap"
                    title={etapa.nome}
                  >
                    {etapa.nome}
                  </h2>
                  <span className="min-w-4 h-4 px-1.5 rounded-full bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center leading-none shrink-0 border border-transparent dark:border-slate-700/60">
                    {negociosEtapa.length}
                  </span>
                </div>

                <div className="flex items-center justify-end shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-white/85 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300 tracking-tight tabular-nums shadow-2xs">
                    {formatCurrency(totalValor)}
                  </span>
                </div>
              </div>

              {/* Área de Cards */}
              <div className="flex flex-col gap-2.5 min-h-[150px]">
                {negociosEtapa.length === 0 ? (
                  <div className="flex-1 rounded-xl border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 bg-white/30 dark:bg-slate-900/20 flex items-center justify-center min-h-[100px]">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      Nenhum negócio
                    </span>
                  </div>
                ) : (
                  (() => {
                    const grupos = negociosEtapa.reduce((acc, negocio) => {
                      const key = `${etapa.codigo}|${negocio.nomeCliente}|${negocio.documento || ''}`;
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(negocio);
                      return acc;
                    }, {} as Record<string, typeof negociosEtapa>);

                    const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

                    const gruposOrdenados = Object.entries(grupos).sort(([, grupoA], [, grupoB]) => {
                      if (sortMode === 'value-desc' || sortMode === 'value-asc') {
                        const totalA = grupoA.reduce((total, negocio) => total + negocio.valor, 0);
                        const totalB = grupoB.reduce((total, negocio) => total + negocio.valor, 0);
                        return sortMode === 'value-desc' ? totalB - totalA : totalA - totalB;
                      }

                      const comparison = grupoA[0].nomeCliente.localeCompare(
                        grupoB[0].nomeCliente,
                        'pt-BR',
                        { sensitivity: 'base', numeric: true },
                      );
                      return sortMode === 'name-desc' ? -comparison : comparison;
                    });

                    return gruposOrdenados.map(([chave, grupoOriginal]) => {
                      const grupo = sortMode === 'value-desc' || sortMode === 'value-asc'
                        ? [...grupoOriginal].sort((negocioA, negocioB) =>
                            sortMode === 'value-desc'
                              ? negocioB.valor - negocioA.valor
                              : negocioA.valor - negocioB.valor,
                          )
                        : grupoOriginal;
                      const totalGrupo = grupo.reduce((acc, n) => acc + n.valor, 0);
                      const totalAtividades = grupo.reduce((acc, n) => acc + (n.atividadesCount || 0), 0);
                      const primeiro = grupo[0];
                      const idsGrupo = grupo.map(n => n.publicId).join(',');

                      return (
                        <div
                          key={chave}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idsGrupo)}
                          className="group/card relative bg-white dark:bg-slate-900/90 p-3 rounded-xl shadow-2xs hover:shadow-md transition-all duration-150 border border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
                        >
                          {/* Cabeçalho do Grupo */}
                          <div
                            role="button"
                            tabIndex={0}
                            title={`Abrir primeiro negócio de ${primeiro.nomeCliente}`}
                            onClick={() => onCardClick(primeiro)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                onCardClick(primeiro);
                              }
                            }}
                            className="flex cursor-pointer items-start justify-between rounded-md outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
                          >
                            <div className="min-w-0 flex-1">
                              <h3 className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100 tracking-tight truncate">
                                {primeiro.nomeCliente}
                              </h3>
                              {primeiro.telefonePrincipal ? (
                                <a
                                  href={getWhatsAppLink(primeiro.telefonePrincipal)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="group/phone mt-0.5 inline-flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 -ml-1 text-[11px] font-medium tracking-tight text-slate-500 transition-all hover:bg-emerald-50/80 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400"
                                  title="Conversar no WhatsApp"
                                  aria-label={`Conversar com ${primeiro.nomeCliente} no WhatsApp pelo número ${primeiro.telefonePrincipal}`}
                                >
                                  <span className="truncate">{primeiro.telefonePrincipal}</span>
                                  <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white opacity-0 shadow-2xs transition-all duration-150 group-hover/phone:scale-110 group-hover/phone:bg-[#20bd5a] group-hover/phone:opacity-100 group-focus-visible/phone:opacity-100">
                                    <MessageCircle className="h-2.5 w-2.5 fill-white/30 text-white" strokeWidth={2.4} />
                                  </span>
                                </a>
                              ) : (
                                <div className="mt-0.5 truncate text-[11px] font-medium tracking-tight text-slate-500 dark:text-slate-400">
                                  Telefone não informado
                                </div>
                              )}
                            </div>
                            
                            <div className="relative ml-2 flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                data-activity-trigger
                                onClick={(e) => handleOpenActivitiesPanel(e, chave, idsGrupo, 'history')}
                                className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold transition-colors ${openGroup === chave && panelMode === 'history' ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' : 'border-slate-200/70 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'}`}
                                title={`Ver histórico de atividades (${totalAtividades})`}
                                aria-label={`Ver histórico de atividades de ${primeiro.nomeCliente}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                <span>{totalAtividades}</span>
                              </button>
                              <button
                                type="button"
                                data-activity-trigger
                                onClick={(e) => handleOpenActivitiesPanel(e, chave, idsGrupo, 'menu')}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${openGroup === chave && panelMode !== 'history' ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' : 'border-slate-200/70 bg-slate-50 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-500 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400'}`}
                                title="Adicionar atividade"
                                aria-label={`Adicionar atividade para ${primeiro.nomeCliente}`}
                              >
                                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>

                          {/* Popover de Atividades */}
                          {openGroup === chave && createPortal(
                            <div
                              ref={activityPanelRef}
                              className={`fixed z-50 flex max-w-[calc(100vw-24px)] flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
                                panelMode === 'menu'
                                  ? 'w-[250px] rounded-lg p-1.5'
                                  : 'w-[320px] rounded-xl'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              draggable={true}
                              style={{ left: panelAnchor.x, top: panelAnchor.y }}
                            >

                              {panelMode !== 'menu' && (
                                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                      {panelMode === 'history' ? <MessageSquare className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="font-bold text-[13px] text-slate-800 dark:text-slate-100">
                                      {panelMode === 'history'
                                        ? 'Histórico de atividades'
                                        : panelMode === 'quick'
                                          ? 'Registrar atividade rápida'
                                          : 'Cadastrar atividade'}
                                    </span>
                                    {panelMode === 'history' && (
                                      <span className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/60">{totalAtividades}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setOpenGroup(null); }}
                                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      title="Fechar"
                                      aria-label="Fechar painel de atividades"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className={panelMode === 'menu' ? 'overflow-y-auto' : 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3'}>
                                {panelMode === 'history' ? (
                                  loadingAtividades ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                    </div>
                                  ) : groupAtividades.length === 0 ? (
                                    <div className="text-center py-4">
                                      <span className="text-xs text-slate-500">Nenhuma atividade registrada</span>
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                                      {groupAtividades.map(ativ => (
                                        <div key={ativ.publicId} className="flex items-start gap-2.5 px-3 py-2.5">
                                          <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                                            ativ.tipo === 'whatsapp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                                            ativ.tipo === 'ligacao' ? 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400' :
                                            ativ.tipo === 'pagamento' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                                            'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                          }`} title={ativ.tipo.charAt(0).toUpperCase() + ativ.tipo.slice(1)}>
                                            {ativ.tipo === 'whatsapp' ? <MessageCircle className="h-3 w-3" /> :
                                             ativ.tipo === 'ligacao' ? <Phone className="h-3 w-3" /> :
                                             ativ.tipo === 'pagamento' ? <CreditCard className="h-3 w-3" /> :
                                             <FileText className="h-3 w-3" />}
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                              <h4 className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{ativ.titulo}</h4>
                                              <time className="shrink-0 text-[9px] font-medium text-slate-400">
                                                {new Date(ativ.ocorridoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                                              </time>
                                            </div>
                                            {ativ.descricao && (
                                              <p className="mt-0.5 truncate text-[11px] leading-4 text-slate-500 dark:text-slate-400" title={ativ.descricao}>
                                                {ativ.descricao}
                                              </p>
                                            )}
                                            <p className="mt-1 truncate text-[9px] text-slate-400">
                                              {ativ.tipo.charAt(0).toUpperCase() + ativ.tipo.slice(1)} · {ativ.nomeUsuario}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                ) : panelMode === 'menu' ? (
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        keepPanelPosition();
                                        setNewActivityType('whatsapp');
                                        setNewActivityTitle('');
                                        setNewActivityDescription('');
                                        setActivityError(null);
                                        setSelectedNegocioId(grupo.length === 1 ? grupo[0].publicId : null);
                                        setPanelMode('create');
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                                        <FileText className="h-4 w-4" />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">Cadastrar atividade</span>
                                        <span className="mt-0.5 block text-[10px] text-slate-400">Informe o tipo, título e detalhes.</span>
                                      </span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        keepPanelPosition();
                                        setActivityError(null);
                                        setSelectedNegocioId(grupo.length > 1 ? ALL_GROUP_DEALS : grupo[0]?.publicId ?? null);
                                        setPanelMode('quick');
                                      }}
                                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                                    >
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                        <MessageSquare className="h-4 w-4" />
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">Registrar atividade rápida</span>
                                        <span className="mt-0.5 block text-[10px] text-slate-400">Use um atalho e registre com um clique.</span>
                                      </span>
                                    </button>
                                  </div>
                                ) : panelMode === 'quick' ? (
                                  <div className="flex flex-col gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivityError(null);
                                        setPanelMode('menu');
                                      }}
                                      className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5" />
                                      Voltar às ações
                                    </button>

                                    {grupo.length > 1 && (
                                      <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        Negócio de destino
                                        <select
                                          value={selectedNegocioId || ''}
                                          onChange={(event) => {
                                            setSelectedNegocioId(event.target.value);
                                            setActivityError(null);
                                          }}
                                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-900/40"
                                        >
                                          <option value={ALL_GROUP_DEALS}>Todos ({grupo.length} negócios)</option>
                                          {grupo.map(n => (
                                            <option key={n.publicId} value={n.publicId}>
                                              {n.competenciaAno ? `${n.competenciaMes}/${n.competenciaAno}` : 'Sem competência'} · {formatCurrency(n.valor)}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    )}

                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Registro rápido</h4>
                                        <p className="mt-0.5 text-[9px] text-slate-400">Clique em um atalho para registrar.</p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenGroup(null);
                                          onOpenQuickActivitiesManager();
                                        }}
                                        className="shrink-0 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                      >
                                        Gerenciar
                                      </button>
                                    </div>

                                    {loadingShortcuts ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                                      </div>
                                    ) : shortcuts.length === 0 ? (
                                      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center dark:border-slate-700">
                                        <p className="text-[11px] font-medium text-slate-500">Nenhum atalho cadastrado.</p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenGroup(null);
                                            onOpenQuickActivitiesManager();
                                          }}
                                          className="mt-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                                        >
                                          Criar atalhos
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                                        {shortcuts.map(shortcut => (
                                          <button
                                            key={shortcut.publicId}
                                            type="button"
                                            disabled={submittingAtividade || !selectedNegocioId}
                                            onClick={() => {
                                              const targetIds = selectedNegocioId === ALL_GROUP_DEALS
                                                ? grupo.map((negocio) => negocio.publicId)
                                                : selectedNegocioId
                                                  ? [selectedNegocioId]
                                                  : [];
                                              setSubmittingShortcutId(shortcut.publicId);
                                              void handleCreateActivity(
                                                shortcut.tipo,
                                                shortcut.tituloPadrao,
                                                shortcut.descricaoPadrao || '',
                                                targetIds,
                                              )
                                                .finally(() => setSubmittingShortcutId(null));
                                            }}
                                            className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800/60"
                                          >
                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white ${
                                              shortcut.tipo === 'whatsapp' ? 'bg-emerald-500' :
                                              shortcut.tipo === 'ligacao' ? 'bg-sky-500' :
                                              shortcut.tipo === 'pagamento' ? 'bg-slate-500' :
                                              'bg-amber-500'
                                            }`}>
                                              {shortcut.tipo === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> :
                                               shortcut.tipo === 'ligacao' ? <Phone className="h-3.5 w-3.5" /> :
                                               shortcut.tipo === 'pagamento' ? <CreditCard className="h-3.5 w-3.5" /> :
                                               <FileText className="h-3.5 w-3.5" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                              <span className="block truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{shortcut.tituloPadrao}</span>
                                              {shortcut.descricaoPadrao && <span className="mt-0.5 block truncate text-[9px] text-slate-400">{shortcut.descricaoPadrao}</span>}
                                            </span>
                                            {submittingShortcutId === shortcut.publicId && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-500" />}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {!selectedNegocioId && grupo.length > 1 && (
                                      <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Selecione um negócio antes de registrar.</p>
                                    )}

                                  </div>
                                ) : (
                                  <form
                                    className="flex flex-col gap-3"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      const title = newActivityTitle.trim();
                                      if (!title) return;
                                      void handleCreateActivity(newActivityType, title, newActivityDescription.trim());
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActivityError(null);
                                        setPanelMode('menu');
                                      }}
                                      className="inline-flex w-fit items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >
                                      <ChevronLeft className="h-3.5 w-3.5" />
                                      Voltar às ações
                                    </button>

                                    {grupo.length > 1 && (
                                      <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        Negócio de destino
                                        <select
                                          value={selectedNegocioId || ''}
                                          onChange={(event) => {
                                            setSelectedNegocioId(event.target.value);
                                            setActivityError(null);
                                          }}
                                          className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-indigo-900/40"
                                          required
                                        >
                                          <option value="" disabled>Selecione um negócio</option>
                                          {grupo.map(n => (
                                            <option key={n.publicId} value={n.publicId}>
                                              {n.competenciaAno ? `${n.competenciaMes}/${n.competenciaAno}` : 'Sem competência'} · {formatCurrency(n.valor)}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    )}

                                    <div className="grid grid-cols-4 gap-1.5" aria-label="Tipo de atividade">
                                      {([
                                        { type: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, active: 'border-emerald-500 bg-emerald-500 text-white', idle: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40' },
                                        { type: 'ligacao', label: 'Ligação', icon: Phone, active: 'border-sky-500 bg-sky-500 text-white', idle: 'border-sky-200 text-sky-600 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/40' },
                                        { type: 'pagamento', label: 'Pagamento', icon: CreditCard, active: 'border-slate-600 bg-slate-600 text-white', idle: 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800' },
                                        { type: 'anotacao', label: 'Nota', icon: FileText, active: 'border-amber-500 bg-amber-500 text-white', idle: 'border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40' },
                                      ] as const).map(({ type, label, icon: Icon, active, idle }) => (
                                        <button
                                          key={type}
                                          type="button"
                                          onClick={() => setNewActivityType(type)}
                                          aria-pressed={newActivityType === type}
                                          className={`flex h-8 min-w-0 items-center justify-center gap-1 rounded-md border px-1 text-[9px] font-semibold transition-colors ${newActivityType === type ? active : idle}`}
                                        >
                                          <Icon className="h-3 w-3 shrink-0" />
                                          <span className="truncate">{label}</span>
                                        </button>
                                      ))}
                                    </div>

                                    <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                      Título
                                      <input
                                        autoFocus
                                        type="text"
                                        value={newActivityTitle}
                                        onChange={(event) => {
                                          setNewActivityTitle(event.target.value);
                                          setActivityError(null);
                                        }}
                                        placeholder="Ex.: Cliente solicitou retorno"
                                        className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                                        required
                                      />
                                    </label>

                                    <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                      Observação <span className="sr-only">opcional</span>
                                      <textarea
                                        value={newActivityDescription}
                                        onChange={(event) => setNewActivityDescription(event.target.value)}
                                        placeholder="Detalhes opcionais…"
                                        rows={2}
                                        className="resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900/40"
                                      />
                                    </label>

                                    {activityError && <p className="text-[10px] font-medium text-rose-500">{activityError}</p>}

                                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => setOpenGroup(null)}
                                        className="h-8 rounded-md px-3 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={submittingAtividade || !newActivityTitle.trim() || !selectedNegocioId}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        {submittingAtividade && <Loader2 className="h-3 w-3 animate-spin" />}
                                        Registrar
                                      </button>
                                    </div>
                                  </form>
                                )}
                              </div>
                            </div>,
                            document.body,
                          )}

                          {/* Lista de Negócios (Linhas) */}
                          <div className="flex flex-col mt-1">
                            {grupo.map((negocio, idx) => (
                              <div
                                key={negocio.publicId}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, negocio.publicId);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCardClick(negocio);
                                }}
                                className={`flex items-center justify-between py-2 cursor-grab active:cursor-grabbing hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-1 px-1 rounded transition-colors ${idx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80' : ''}`}
                              >
                                <div className="flex items-center gap-2 shrink-0">
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0 bg-indigo-50 text-indigo-600 border-indigo-200"
                                    title={`Responsável: ${negocio.nomeOperador?.trim() || 'Sem responsável'}`}
                                  >
                                    {getNameInitial(negocio.nomeOperador)}
                                  </div>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    {negocio.dataVencimento
                                      ? new Date(negocio.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                                      : negocio.competenciaMes && negocio.competenciaAno 
                                        ? `${MESES_ABREV[negocio.competenciaMes - 1]}/${negocio.competenciaAno}` 
                                        : '—'}
                                  </span>
                                </div>
                                <span className="font-display font-bold text-[13px] tracking-tight shrink-0 text-slate-900 dark:text-slate-100">
                                  {formatCurrency(negocio.valor)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Rodapé (Total do Grupo) */}
                          {grupo.length > 1 && (
                            <div className="flex items-center justify-between pt-2.5 mt-0.5 border-t border-slate-100 dark:border-slate-800/80">
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                Total em aberto {grupo.length}
                              </span>
                              <span className="font-display font-bold text-[13px] text-slate-900 dark:text-slate-100">
                                {formatCurrency(totalGrupo)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
              </section>
            </div>
          );
        })}

        {etapas.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-slate-500 text-sm">Nenhuma etapa configurada no banco.</span>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};
