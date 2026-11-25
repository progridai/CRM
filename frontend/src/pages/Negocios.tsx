import React, { useState, useEffect, useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { listarEtapas, listarNegocios, moverEtapa, type EtapaDto, type NegocioDto } from '../services/negociosService';
import { NegociosHeader } from '../components/Negocios/NegociosHeader';
import { KanbanBoard } from '../components/Negocios/KanbanBoard';
import { NegociosListView } from '../components/Negocios/NegociosListView';
import { NovoNegocioModal } from '../components/Negocios/NovoNegocioModal';
import { NegocioDetalhesDrawer } from '../components/Negocios/NegocioDetalhesDrawer';
import { QuickActivitiesDrawer } from '../components/Negocios/QuickActivitiesDrawer';
import { WhatsAppDisparoModal } from '../components/WhatsApp/WhatsAppDisparoModal';
import {
  DEFAULT_NEGOCIOS_FILTERS,
  filterNegocios,
  type NegociosFilters,
} from '../components/Negocios/negociosIndicators';
import type { NegociosSort, ViewMode } from '../types';

export const NegociosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const operadorFiltroInicial = searchParams.get('operador')?.trim();
  const negocioSelecionadoId = searchParams.get('negocio')?.trim();
  const abrirNovoNegocio = searchParams.get('novo') === '1';
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [sortMode, setSortMode] = useState<NegociosSort>('name-asc');
  const [etapas, setEtapas]     = useState<EtapaDto[]>([]);
  const [negocios, setNegocios] = useState<NegocioDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [carregandoEtapas, setCarregandoEtapas] = useState(true);
  const consultaAtual = useRef<AbortController | null>(null);
  const [erro, setErro]         = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [selectedNegocio, setSelectedNegocio] = useState<NegocioDto | null>(null);
  const [quickActivitiesOpen, setQuickActivitiesOpen] = useState(false);
  const [whatsAppNegocioIds, setWhatsAppNegocioIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<NegociosFilters>(() => ({
    ...DEFAULT_NEGOCIOS_FILTERS,
    owner: operadorFiltroInicial || DEFAULT_NEGOCIOS_FILTERS.owner,
  }));

  const filtrosAplicados = useDeferredValue(filters);
  const negociosFiltrados = useMemo(() => filterNegocios(negocios, filtrosAplicados), [negocios, filtrosAplicados]);
  const ordenacaoDaVista = viewMode === 'list' && sortMode === 'parcelas-desc' ? 'name-asc' : sortMode;
  const chaveVisualizacao = JSON.stringify([filtrosAplicados, ordenacaoDaVista]);

  // ── Carregamento das etapas e negócios ─────────────────────────────────────
  const carregarDados = useCallback(async () => {
    consultaAtual.current?.abort();
    const consulta = new AbortController();
    consultaAtual.current = consulta;
    try {
      setErro(null);
      const dataNegocios = await listarNegocios(consulta.signal);
      if (consulta.signal.aborted) return;
      setNegocios(dataNegocios);
      setSelectedNegocio(atual => atual ? dataNegocios.find(item => item.publicId === atual.publicId) ?? atual : null);
    } catch (err) {
      if (!consulta.signal.aborted) setErro(err instanceof Error ? err.message : 'Erro ao carregar os negócios.');
    } finally {
      if (!consulta.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const consultaEtapas = new AbortController();
    listarEtapas(consultaEtapas.signal)
      .then(dados => { if (!consultaEtapas.signal.aborted) setEtapas(dados); })
      .catch(() => { if (!consultaEtapas.signal.aborted) setErro('Erro ao carregar as etapas do Kanban.'); })
      .finally(() => { if (!consultaEtapas.signal.aborted) setCarregandoEtapas(false); });
    void carregarDados();
    return () => {
      consultaEtapas.abort();
      consultaAtual.current?.abort();
    };
  }, [carregarDados]);

  useEffect(() => {
    if (loading || !negocioSelecionadoId) return;

    const negocioSelecionado = negocios.find(
      (negocio) => negocio.publicId === negocioSelecionadoId,
    );
    if (negocioSelecionado) setSelectedNegocio(negocioSelecionado);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('negocio');
    setSearchParams(nextParams, { replace: true });
  }, [loading, negocioSelecionadoId, negocios, searchParams, setSearchParams]);

  useEffect(() => {
    if (!abrirNovoNegocio) return;

    setModalAberto(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('novo');
    setSearchParams(nextParams, { replace: true });
  }, [abrirNovoNegocio, searchParams, setSearchParams]);

  // ── Callback chamado após criação bem-sucedida do negócio ─────────────────
  const handleNegocioCriado = useCallback(() => {
    // Apenas recarregamos os dados. Se for necessário, podemos otimizar 
    // recarregando apenas a lista de negócios.
    carregarDados();
  }, [carregarDados]);

  const handleDropCards = useCallback(async (negocioPublicIds: string[], novaEtapaCodigo: string) => {
    const novaEtapa = etapas.find(e => e.codigo === novaEtapaCodigo);
    if (!novaEtapa) return;

    const ids = new Set(negocioPublicIds);
    const movimentos = negocios.filter(n => ids.has(n.publicId) && n.etapaCodigo !== novaEtapaCodigo);
    if (!movimentos.length) return;

    const etapasAnteriores = new Map(movimentos.map(n => [n.publicId, n.etapaCodigo]));
    setNegocios(prev => prev.map(n => etapasAnteriores.has(n.publicId) ? { ...n, etapaCodigo: novaEtapaCodigo } : n));

    const resultados = await Promise.allSettled(movimentos.map(n => moverEtapa(n.publicId, novaEtapa.publicId)));
    const falharam = new Set(movimentos.filter((_, indice) => resultados[indice].status === 'rejected').map(n => n.publicId));
    if (falharam.size) {
      setNegocios(prev => prev.map(n => falharam.has(n.publicId) && n.etapaCodigo === novaEtapaCodigo
        ? { ...n, etapaCodigo: etapasAnteriores.get(n.publicId) ?? n.etapaCodigo } : n));
    }
    if (falharam.size < movimentos.length) await carregarDados();
    if (falharam.size) setErro(`Não foi possível mover ${falharam.size} negócio(s).`);
  }, [negocios, etapas, carregarDados]);

  return (
    <div className="h-full flex flex-col w-full">
      <NegociosHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNovoNegocio={() => setModalAberto(true)}
        negocios={negociosFiltrados}
        todosNegocios={negocios}
        filters={filters}
        onFiltersChange={setFilters}
        sortMode={ordenacaoDaVista}
        onSortModeChange={setSortMode}
        carregando={loading}
      />

      {erro && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:border-rose-800 text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{erro}</p>
        </div>
      )}

      {loading || carregandoEtapas ? (
        <div role="status" className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <p>Carregando negócios…</p>
          <div className="flex gap-3 overflow-hidden" aria-hidden="true">
            {etapas.map(etapa => <div key={etapa.codigo} className="w-80 shrink-0 rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
              <p className="mb-3 text-xs font-semibold">{etapa.nome}</p>
              <div className="h-24 motion-safe:animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>)}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard 
          key={chaveVisualizacao}
          etapas={etapas} 
          negocios={negociosFiltrados}
          onCardClick={setSelectedNegocio} 
          onDropCard={handleDropCards}
          onOpenQuickActivitiesManager={() => setQuickActivitiesOpen(true)}
          onOpenWhatsApp={setWhatsAppNegocioIds}
          onAtividadeRegistrada={carregarDados}
          sortMode={ordenacaoDaVista}
        />
      ) : (
        <NegociosListView
          key={chaveVisualizacao}
          etapas={etapas}
          negocios={negociosFiltrados}
          onSelectNegocio={setSelectedNegocio}
          onUpdateEtapa={(id, etapa) => void handleDropCards([id], etapa)}
          sortMode={ordenacaoDaVista}
        />
      )}

      {/* Modal de Novo Negócio */}
      <NovoNegocioModal
        isOpen={modalAberto}
        etapas={etapas}
        onClose={() => setModalAberto(false)}
        onNegocioCriado={handleNegocioCriado}
      />

      {/* Drawer de Detalhes */}
      <NegocioDetalhesDrawer
        isOpen={!!selectedNegocio}
        negocio={selectedNegocio}
        etapas={etapas}
        onClose={() => setSelectedNegocio(null)}
        onAtividadeRegistrada={carregarDados}
      />

      <QuickActivitiesDrawer 
        isOpen={quickActivitiesOpen} 
        onClose={() => setQuickActivitiesOpen(false)} 
      />

      <WhatsAppDisparoModal
        isOpen={whatsAppNegocioIds.length > 0}
        negocioIds={whatsAppNegocioIds}
        tipo="individual"
        onClose={() => setWhatsAppNegocioIds([])}
        onCompleted={() => void carregarDados()}
      />
    </div>
  );
};
