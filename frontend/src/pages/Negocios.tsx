import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { listarEtapas, listarNegocios, type EtapaDto, type NegocioDto } from '../services/negociosService';
import { NegociosHeader } from '../components/Negocios/NegociosHeader';
import { KanbanBoard } from '../components/Negocios/KanbanBoard';
import { NovoNegocioModal } from '../components/Negocios/NovoNegocioModal';
import { NegocioDetalhesDrawer } from '../components/Negocios/NegocioDetalhesDrawer';
import type { ViewMode } from '../types';

export const NegociosPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [etapas, setEtapas]     = useState<EtapaDto[]>([]);
  const [negocios, setNegocios] = useState<NegocioDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [erro, setErro]         = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [selectedNegocio, setSelectedNegocio] = useState<NegocioDto | null>(null);

  // ── Carregamento das etapas e negócios ─────────────────────────────────────
  const carregarDados = useCallback(async () => {
    try {
      setErro(null);
      const [dataEtapas, dataNegocios] = await Promise.all([
        listarEtapas(),
        listarNegocios()
      ]);
      setEtapas(dataEtapas);
      setNegocios(dataNegocios);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao carregar os dados do Kanban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // ── Callback chamado após criação bem-sucedida do negócio ─────────────────
  const handleNegocioCriado = useCallback(() => {
    // Apenas recarregamos os dados. Se for necessário, podemos otimizar 
    // recarregando apenas a lista de negócios.
    carregarDados();
  }, [carregarDados]);

  return (
    <div className="h-full flex flex-col w-full">
      <NegociosHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        onNovoNegocio={() => setModalAberto(true)}
      />

      {erro && (
        <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 dark:border-rose-800 text-rose-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{erro}</p>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard etapas={etapas} negocios={negocios} onCardClick={setSelectedNegocio} />
      ) : (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-slate-500 text-sm">Visão de Lista (em breve)</p>
        </div>
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
      />
    </div>
  );
};
