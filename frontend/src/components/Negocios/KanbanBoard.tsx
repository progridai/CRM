import React from 'react';
import type { EtapaDto, NegocioDto } from '../../services/negociosService';

interface KanbanBoardProps {
  etapas: EtapaDto[];
  negocios: NegocioDto[];
  onCardClick: (negocio: NegocioDto) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ etapas, negocios, onCardClick }) => {
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
                  negociosEtapa.map((negocio) => (
                    <div
                      key={negocio.publicId}
                      onClick={() => onCardClick(negocio)}
                      className="group relative bg-white dark:bg-slate-900/90 p-3 rounded-xl shadow-2xs hover:shadow-md cursor-pointer transition-all duration-150 border border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate">
                            {negocio.nomeCliente}
                          </h3>
                          {negocio.telefonePrincipal && negocio.telefonePrincipal.trim() ? (
                            <a
                              href={`https://web.whatsapp.com/send?phone=55${negocio.telefonePrincipal.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => { e.stopPropagation(); }}
                              className="group/phone inline-flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium hover:text-emerald-600 dark:hover:text-emerald-400 transition-all py-0.5 px-1 -ml-1 rounded hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 cursor-pointer"
                              title="Conversar no WhatsApp"
                            >
                              <span className="tracking-tight">{negocio.telefonePrincipal}</span>
                            </a>
                          ) : (
                            <div className="mt-0.5 py-0.5 px-1 -ml-1 inline-flex">
                              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-tight">Telefone não informado</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              type="button"
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-0.5 rounded w-5 h-5 flex items-center justify-center transition-opacity cursor-pointer"
                              title="Mais opções"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical w-3.5 h-3.5"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                          </div>
                          <button
                            type="button"
                            className="group/btn inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer shadow-2xs select-none bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200/70 dark:border-slate-700/80"
                            title="0 atividades registradas"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-3 h-3 transition-colors text-slate-400 dark:text-slate-500 group-hover/btn:text-slate-600 dark:group-hover/btn:text-slate-300"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
                            <span className="tabular-nums font-mono text-[11px] leading-none">0</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold border shrink-0 bg-indigo-100 text-indigo-700 border-indigo-200" title="Responsável: Helena">
                            H
                          </div>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {negocio.dataVencimento ? new Date(negocio.dataVencimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }).slice(0, 5) + '/' + new Date(negocio.dataVencimento).getFullYear() : `${negocio.competenciaMes.toString().padStart(2, '0')}/${negocio.competenciaAno}`}
                          </span>
                        </div>
                        <div className="flex-1 flex justify-center px-1 min-w-0"></div>
                        <span className="font-display font-bold text-sm tracking-tight shrink-0 text-slate-900 dark:text-slate-100">
                          {formatCurrency(negocio.valor)}
                        </span>
                      </div>
                    </div>
                  ))
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
