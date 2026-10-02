import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { DealDrawer } from './components/DealDrawer';
import { NewDealModal } from './components/NewDealModal';
import { CommandPalette } from './components/CommandPalette';
import { ContactsView } from './components/ContactsView';
import { UsersView } from './components/UsersView';
import { Deal, Contact, DealStage, ViewMode, HistoryEvent, HistoryEventType, AppUser } from './types';
import { INITIAL_DEALS, INITIAL_CONTACTS, INITIAL_USERS, STAGE_CONFIG } from './mockData';
import { getDealHistory, formatDateTimeBR } from './historyUtils';
import { generateId } from './utils';

export default function App() {
  const [deals, setDeals] = useState<Deal[]>(() => {
    const saved = localStorage.getItem('recupera_crm_deals_v6');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved deals v6', e);
      }
    }

    // Se houver dados de versões anteriores, migra limpando atividades de sistema e zerando nova_posicao
    const oldSaved = localStorage.getItem('recupera_crm_deals_v5') || localStorage.getItem('recupera_crm_deals');
    if (oldSaved) {
      try {
        const parsed = JSON.parse(oldSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const stageMap: Record<string, DealStage> = {
            novo: 'nova_posicao',
            sem_contato: 'contato_em_andamento',
            contato_realizado: 'contato_em_andamento',
            em_negociacao: 'em_negociacao',
            aguardando_pagamento: 'aguardando_pagamento',
            concluido: 'quitado',
            encerrado: 'encerrado_sem_pagamento'
          };
          return parsed.map((deal: any) => {
            const mappedStatus: DealStage =
              stageMap[deal.status] ||
              (deal.status as DealStage) ||
              'nova_posicao';
            const owner = deal.owner === 'Helena' ? 'Helena' : 'Ymalaia';
            const ownerAvatar = owner === 'Helena' ? 'H' : 'Y';

            // Remove atividades de sistema / importação inicial
            let activities = (deal.activities || []).filter((act: any) => {
              if (act.type === 'system') return false;
              const title = (act.title || '').toLowerCase();
              if (
                title.includes('importa') ||
                title.includes('cadastrado') ||
                title.includes('lote') ||
                title.includes('título gerado')
              ) {
                return false;
              }
              return true;
            });

            // Deals em nova posição começam com atividades zeradas
            if (mappedStatus === 'nova_posicao') {
              activities = [];
            }

            return {
              ...deal,
              status: mappedStatus,
              owner,
              ownerAvatar,
              activities,
              commentCount: activities.length,
              statusBadge: deal.statusBadge === 'Liquidado' ? undefined : deal.statusBadge
            };
          });
        }
      } catch (e) {
        console.error('Failed to migrate saved deals', e);
      }
    }

    return INITIAL_DEALS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('recupera_crm_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved contacts', e);
      }
    }
    return INITIAL_CONTACTS;
  });

  const [users, setUsers] = useState<AppUser[]>(() => {
    const saved = localStorage.getItem('progrid_crm_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    return INITIAL_USERS;
  });

  const [activeTab, setActiveTab] = useState<'negocios' | 'contatos' | 'usuarios'>('negocios');
  const [kanbanInitialOwnerFilter, setKanbanInitialOwnerFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // Dark mode state: SEMPRE abre no modo claro por padrão
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Garante que ao abrir ou recarregar sempre comece no claro
    document.documentElement.classList.remove('dark');
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Modals & Panels
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [drawerInitialTab, setDrawerInitialTab] = useState<'geral' | 'atividades' | 'historico'>('geral');
  const [drawerExpandActivityForm, setDrawerExpandActivityForm] = useState(false);
  const [isNewDealModalOpen, setIsNewDealModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleSelectDeal = (
    deal: Deal | null,
    tab: 'geral' | 'atividades' | 'historico' = 'geral',
    expandActivityForm = false
  ) => {
    setDrawerInitialTab(tab);
    setDrawerExpandActivityForm(expandActivityForm);
    setSelectedDeal(deal);
  };

  // Persistence
  useEffect(() => {
    localStorage.setItem('recupera_crm_deals_v6', JSON.stringify(deals));
  }, [deals]);

  useEffect(() => {
    localStorage.setItem('recupera_crm_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('progrid_crm_users', JSON.stringify(users));
  }, [users]);

  // Deal handlers
  const handleUpdateDeal = (updatedDeal: Deal) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d))
    );
    if (selectedDeal && selectedDeal.id === updatedDeal.id) {
      setSelectedDeal(updatedDeal);
    }
  };

  const handleUpdateDealStage = (dealIds: string | string[], newStage: DealStage) => {
    const ids = Array.isArray(dealIds) ? dealIds : [dealIds];
    setDeals((prev) =>
      prev.map((d) => {
        if (ids.includes(d.id) && d.status !== newStage) {
          const prevStage = d.status;
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

          const currentHistory = getDealHistory(d);
          const newHistoryEvent: HistoryEvent = {
            id: generateId(),
            type: eventType,
            title: eventTitle,
            actor: d.owner || 'Helena',
            timestamp: formatDateTimeBR(new Date()),
            description: eventDesc,
            details: { fromStage: prevStage, toStage: newStage }
          };

          const updated: Deal = {
            ...d,
            status: newStage,
            updatedAt: new Date().toISOString(),
            history: [...currentHistory, newHistoryEvent]
          };

          if (selectedDeal && selectedDeal.id === d.id) {
            setSelectedDeal(updated);
          }

          return updated;
        }
        return d;
      })
    );
  };

  const handleCreateDeal = (newDeal: Deal) => {
    const historyEvent: HistoryEvent = {
      id: generateId(),
      type: 'import',
      title: 'Negócio importado',
      actor: 'Sistema',
      timestamp: formatDateTimeBR(new Date()),
      description: `Importado para a etapa "${STAGE_CONFIG[newDeal.status]?.label || 'Nova posição'}"`
    };
    const dealWithHistory: Deal = {
      ...newDeal,
      history: [historyEvent]
    };
    setDeals((prev) => [dealWithHistory, ...prev]);

    // Also register debtor in contacts if not exists
    setContacts((prev) => {
      const exists = prev.find(
        (c) => c.name.toLowerCase() === newDeal.clientName.toLowerCase()
      );
      if (!exists) {
        return [
          {
            id: `c-${Date.now()}`,
            name: newDeal.clientName,
            phone: newDeal.phone,
            document: newDeal.document,
            email: '',
            origin: newDeal.origin,
            totalDebt: newDeal.amount,
            activeDealsCount: 1,
            status: 'Ativo'
          },
          ...prev
        ];
      }
      return prev;
    });
  };

  const handleDeleteDeal = (dealId: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    if (selectedDeal && selectedDeal.id === dealId) {
      setSelectedDeal(null);
    }
  };

  const handleResetDemoData = () => {
    localStorage.removeItem('recupera_crm_deals');
    localStorage.removeItem('recupera_crm_deals_v2');
    localStorage.removeItem('recupera_crm_deals_v3');
    localStorage.removeItem('recupera_crm_deals_v4');
    localStorage.removeItem('recupera_crm_deals_v5');
    localStorage.removeItem('recupera_crm_contacts');
    localStorage.removeItem('progrid_crm_users');
    setDeals(INITIAL_DEALS);
    setContacts(INITIAL_CONTACTS);
    setUsers(INITIAL_USERS);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-[#0b0f19] text-slate-100' : 'bg-[#f7f9fb] text-[#191c1e]'} flex transition-colors duration-200`}>
      {/* Fixed Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dealsCount={deals.length}
        contactsCount={contacts.length}
        usersCount={users.length}
        onResetDemoData={handleResetDemoData}
      />

      {/* Main Content Area */}
      <div className="pl-60 flex-1 flex flex-col min-w-0">
        {/* Top Header with Dark Mode Toggle next to profile */}
        <Header
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onOpenNewDealModal={() => setIsNewDealModalOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        />

        {/* Main Content View with top padding for fixed header */}
        <main className={`w-full pt-18 px-6 pb-12 ${isDarkMode ? 'bg-[#0b0f19]' : 'bg-[#f7f9fb]'} min-h-screen transition-colors duration-200`}>
          {activeTab === 'negocios' && (
            <>
              {viewMode === 'kanban' ? (
                <KanbanBoard
                  deals={deals}
                  onSelectDeal={handleSelectDeal}
                  onOpenNewDealModal={() => setIsNewDealModalOpen(true)}
                  onUpdateDealStage={handleUpdateDealStage}
                  onUpdateDeal={handleUpdateDeal}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  initialOwnerFilter={kanbanInitialOwnerFilter}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2">
                    <div>
                      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        Negócios
                      </h1>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                        {deals.length} {deals.length === 1 ? 'posição encontrada' : 'posições encontradas'}
                      </p>
                    </div>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
                    >
                      Voltar para Kanban
                    </button>
                  </div>
                  <ListView
                    deals={deals}
                    onSelectDeal={(deal) => handleSelectDeal(deal, 'geral')}
                    onUpdateDealStage={handleUpdateDealStage}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'contatos' && <ContactsView contacts={contacts} />}

          {activeTab === 'usuarios' && (
            <UsersView
              users={users}
              deals={deals}
              onFilterByOperator={(operatorName) => {
                setKanbanInitialOwnerFilter(operatorName);
                setViewMode('kanban');
                setActiveTab('negocios');
              }}
            />
          )}
        </main>
      </div>

      {/* Slide-over Deal Detail Drawer */}
      <DealDrawer
        deal={selectedDeal}
        isOpen={!!selectedDeal}
        onClose={() => {
          setSelectedDeal(null);
          setDrawerExpandActivityForm(false);
        }}
        onUpdateDeal={handleUpdateDeal}
        onDeleteDeal={handleDeleteDeal}
        initialTab={drawerInitialTab}
        initialExpandActivityForm={drawerExpandActivityForm}
      />

      {/* Modal "+ Novo Negócio" */}
      <NewDealModal
        isOpen={isNewDealModalOpen}
        onClose={() => setIsNewDealModalOpen(false)}
        onCreateDeal={handleCreateDeal}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        deals={deals}
        contacts={contacts}
        onSelectDeal={setSelectedDeal}
        onOpenNewDealModal={() => setIsNewDealModalOpen(true)}
      />
    </div>
  );
}
