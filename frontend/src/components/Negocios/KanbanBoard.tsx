import React, { useState } from 'react';
import { Loader2, X, Phone, MessageCircle, MessageSquare, Zap, ExternalLink, FileText, CreditCard } from 'lucide-react';
import { listarAtividades, registrarAtividade, type AtividadeDto, type EtapaDto, type NegocioDto } from '../../services/negociosService';
import { useQuickActivityTemplates } from '../../hooks/useQuickActivityTemplates';
import { getNameInitial, getWhatsAppLink } from '../../utils';

interface KanbanBoardProps {
  etapas: EtapaDto[];
  negocios: NegocioDto[];
  onCardClick: (negocio: NegocioDto) => void;
  onDropCard: (negocioPublicId: string, novaEtapaCodigo: string) => void;
  onOpenQuickActivitiesManager: () => void;
  onAtividadeRegistrada?: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ etapas, negocios, onCardClick, onDropCard, onOpenQuickActivitiesManager, onAtividadeRegistrada }) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [groupAtividades, setGroupAtividades] = useState<AtividadeDto[]>([]);
  const [loadingAtividades, setLoadingAtividades] = useState(false);
  const [popoverTab, setPopoverTab] = useState<'history' | 'quick_create' | 'custom_form'>('history');
  const [selectedNegocioId, setSelectedNegocioId] = useState<string | null>(null);
  const [submittingAtividade, setSubmittingAtividade] = useState(false);

  const { templates: shortcuts, loading: loadingShortcuts } = useQuickActivityTemplates();

  const handleOpenAtividades = async (e: React.MouseEvent, chave: string, idsStr: string) => {
    e.stopPropagation();
    if (openGroup === chave) {
      setOpenGroup(null);
      return;
    }
    setOpenGroup(chave);
    setPopoverTab('history');
    setLoadingAtividades(true);
    try {
      const ids = idsStr.split(',');
      if (ids.length === 1) {
        setSelectedNegocioId(ids[0]);
      } else {
        setSelectedNegocioId(null);
      }
      const data = await listarAtividades(ids);
      setGroupAtividades(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAtividades(false);
    }
  };

  const handleCreateActivity = async (tipo: string, titulo: string, descricao: string) => {
    if (!selectedNegocioId) {
      alert("Por favor, selecione um negócio para registrar a atividade.");
      return;
    }
    try {
      setSubmittingAtividade(true);
      await registrarAtividade(selectedNegocioId, { tipo, titulo, descricao });

      // Close the popover immediately after success
      setOpenGroup(null);

      // Notify parent to refresh negocios (updates atividadesCount on each card)
      onAtividadeRegistrada?.();
    } catch (err) {
      console.error('Erro ao registrar atividade', err);
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
    <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-4 h-full pb-4 items-start min-h-[500px]">
        {etapas.map((etapa) => {
          // Filtra negócios desta etapa
          const negociosEtapa = negocios.filter((n) => n.etapaCodigo === etapa.codigo);
          const totalValor = negociosEtapa.reduce((acc, n) => acc + n.valor, 0);

          // Fallback para cor_hex vazio
          const color = etapa.corHex || '#94a3b8';
          
          // Adiciona opacidade de ~8% via hexadecimal (ex: #6366f1 -> #6366f115)
          const fallbackBgColor = color + '15';

          return (
            <section
              key={etapa.codigo}
              style={{ backgroundColor: `var(--kanban-${etapa.codigo}-bg, ${fallbackBgColor})` }}
              className="w-[330px] flex-shrink-0 flex flex-col gap-3 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, etapa.codigo)}
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

                    return Object.entries(grupos).map(([chave, grupo]) => {
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
                            
                            <div className="flex items-center shrink-0 ml-2 relative">
                              <button
                                type="button"
                                onClick={(e) => handleOpenAtividades(e, chave, idsGrupo)}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${openGroup === chave ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' : 'border-slate-200/70 dark:border-slate-700/80 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                title={`${totalAtividades} atividades registradas`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                                <span>{totalAtividades}</span>
                              </button>
                            </div>
                          </div>

                          {/* Popover de Atividades */}
                          {openGroup === chave && (
                            <div 
                              className="absolute top-10 left-0 w-full sm:w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl z-50 flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                              onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              draggable={true}
                              style={{ maxHeight: '350px' }}
                            >
                              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-bold text-[13px] text-slate-800 dark:text-slate-100">Atividades Registradas</span>
                                  <span className="bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/60">{totalAtividades}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => setPopoverTab(popoverTab === 'history' ? 'quick_create' : 'history')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                    <Zap className={`w-3.5 h-3.5 ${popoverTab === 'quick_create' ? 'text-amber-500 fill-amber-500' : ''}`} />
                                  </button>
                                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setOpenGroup(null); }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                                {popoverTab === 'history' ? (
                                  loadingAtividades ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                    </div>
                                  ) : groupAtividades.length === 0 ? (
                                    <div className="text-center py-4">
                                      <span className="text-xs text-slate-500">Nenhuma atividade registrada</span>
                                    </div>
                                  ) : (
                                    groupAtividades.map(ativ => {
                                      return (
                                      <div key={ativ.publicId} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col relative group">
                                        <div className="flex items-start justify-between mb-2">
                                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-xs ${
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
                                          </div>
                                          <span className="text-[10px] text-slate-400 font-mono font-medium pt-1">
                                            {new Date(ativ.ocorridoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                                          </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 leading-tight">{ativ.titulo}</h4>
                                        {ativ.descricao && <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{ativ.descricao}</p>}
                                        
                                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                          <span>Registrado por: {ativ.nomeUsuario}</span>
                                        </div>
                                      </div>
                                    )})
                                  )
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <div className="mb-2">
                                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">Registrar Atividade Rápida</h4>
                                      {grupo.length > 1 && (
                                        <div className="mb-3">
                                          <label className="text-[10px] text-slate-500 font-semibold mb-1 block">Selecione o negócio de destino:</label>
                                          <select 
                                            value={selectedNegocioId || ''} 
                                            onChange={(e) => setSelectedNegocioId(e.target.value)}
                                            className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                                          >
                                            <option value="" disabled>Selecione um negócio...</option>
                                            {grupo.map(n => (
                                              <option key={n.publicId} value={n.publicId}>
                                                {n.competenciaAno ? `Comp: ${n.competenciaMes}/${n.competenciaAno}` : 'Negócio sem data'} - {formatCurrency(n.valor)}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {loadingShortcuts ? (
                                      <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                      </div>
                                    ) : shortcuts.length === 0 ? (
                                      <div className="text-center py-4 text-xs text-slate-500">
                                        Nenhum atalho cadastrado.
                                      </div>
                                    ) : (
                                      shortcuts.map(shortcut => (
                                        <button 
                                          key={shortcut.publicId}
                                          disabled={submittingAtividade || (grupo.length > 1 && !selectedNegocioId)}
                                          onClick={() => handleCreateActivity(shortcut.tipo, shortcut.tituloPadrao, shortcut.descricaoPadrao || '')}
                                          className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${(submittingAtividade || (grupo.length > 1 && !selectedNegocioId)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <div className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${
                                            shortcut.tipo === 'whatsapp' ? 'bg-emerald-500 text-white' : 
                                            shortcut.tipo === 'ligacao' ? 'bg-[#1FB6FF] text-white' : 
                                            shortcut.tipo === 'pagamento' ? 'bg-slate-500 text-white' : 
                                            'bg-amber-500 text-white'
                                          }`}>
                                            {shortcut.tipo === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> :
                                             shortcut.tipo === 'ligacao' ? <Phone className="w-3.5 h-3.5 fill-current" /> :
                                             shortcut.tipo === 'pagamento' ? <CreditCard className="w-3.5 h-3.5" /> :
                                             <FileText className="w-3.5 h-3.5" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{shortcut.tituloPadrao}</div>
                                            {shortcut.descricaoPadrao && <div className="text-[9px] text-slate-500 truncate">{shortcut.descricaoPadrao}</div>}
                                          </div>
                                        </button>
                                      ))
                                    )}
                                    <div className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-end">
                                      <button 
                                        onClick={() => {
                                          setOpenGroup(null);
                                          onOpenQuickActivitiesManager();
                                        }}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                                      >
                                        Gerenciar Atalhos
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
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
          );
        })}

        {etapas.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-slate-500 text-sm">Nenhuma etapa configurada no banco.</span>
          </div>
        )}
      </div>
    </div>
  );
};
