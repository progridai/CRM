import { Deal, HistoryEvent, DealStage } from './types';
import { STAGE_CONFIG } from './mockData';

/**
 * Formats date into DD/MM/YYYY HH:mm
 */
export function formatDateTimeBR(dateInput: Date | string = new Date()): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) {
    return typeof dateInput === 'string' ? dateInput : '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Generates an initial or comprehensive history sequence for a deal
 * matching the user's specification and stages progression.
 */
export function generateMockHistoryForDeal(deal: Deal): HistoryEvent[] {
  const events: HistoryEvent[] = [];
  const baseDate = new Date(deal.createdAt || '2026-09-01T08:00:00Z');

  // Helper to advance time slightly
  const addHours = (date: Date, hours: number) => {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  };

  let currentTime = baseDate;

  // 1. Negócio importado pelo sistema
  events.push({
    id: `hist-${deal.id}-import`,
    type: 'import',
    title: 'Negócio importado',
    actor: 'Sistema',
    timestamp: formatDateTimeBR(currentTime),
    description: 'Importado para a etapa "Nova posição"'
  });

  const stageOrder: DealStage[] = [
    'nova_posicao',
    'contato_em_andamento',
    'em_negociacao',
    'aguardando_pagamento',
    deal.status === 'encerrado_sem_pagamento' ? 'encerrado_sem_pagamento' : 'quitado'
  ];

  const currentStageIndex = stageOrder.indexOf(deal.status);

  // If deal moved to "contato_em_andamento" or beyond
  if (currentStageIndex >= 1 || deal.status === 'encerrado_sem_pagamento' || deal.status === 'quitado') {
    currentTime = addHours(currentTime, 1.25);
    events.push({
      id: `hist-${deal.id}-stage-1`,
      type: 'stage_change',
      title: 'Mudança de etapa',
      actor: deal.owner || 'Helena',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Nova posição → Contato em andamento',
      details: { fromStage: 'nova_posicao', toStage: 'contato_em_andamento' }
    });

    // Add first activity if present
    if (deal.activities && deal.activities.length > 0) {
      currentTime = addHours(currentTime, 0.4);
      const act1 = deal.activities[deal.activities.length - 1]; // oldest in list
      events.push({
        id: `hist-${deal.id}-act-1`,
        type: 'activity_added',
        title: 'Atividade registrada',
        actor: act1.author || deal.owner || 'Helena',
        timestamp: act1.timestamp || formatDateTimeBR(currentTime),
        description: act1.title,
        details: { activityType: act1.type }
      });
    } else if (deal.status !== 'nova_posicao') {
      currentTime = addHours(currentTime, 0.4);
      events.push({
        id: `hist-${deal.id}-act-default-1`,
        type: 'activity_added',
        title: 'Atividade registrada',
        actor: deal.owner || 'Helena',
        timestamp: formatDateTimeBR(currentTime),
        description: 'Tentativa de ligação'
      });
    }
  }

  // If deal moved to "em_negociacao" or beyond
  if (
    currentStageIndex >= 2 ||
    deal.status === 'aguardando_pagamento' ||
    deal.status === 'quitado'
  ) {
    // If owner changed during negotiation
    if (deal.owner === 'Ymalaia') {
      currentTime = addHours(currentTime, 4);
      events.push({
        id: `hist-${deal.id}-owner-change`,
        type: 'owner_change',
        title: 'Alteração de responsável',
        actor: 'Helena',
        timestamp: formatDateTimeBR(currentTime),
        description: 'Helena → Ymalaia',
        details: { fromOwner: 'Helena', toOwner: 'Ymalaia' }
      });
    }

    currentTime = addHours(currentTime, 4.5);
    events.push({
      id: `hist-${deal.id}-stage-2`,
      type: 'stage_change',
      title: 'Mudança de etapa',
      actor: deal.owner || 'Helena',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Contato em andamento → Em negociação',
      details: { fromStage: 'contato_em_andamento', toStage: 'em_negociacao' }
    });

    // Secondary activity
    currentTime = addHours(currentTime, 18);
    events.push({
      id: `hist-${deal.id}-act-2`,
      type: 'activity_added',
      title: 'Atividade registrada',
      actor: deal.owner || 'Ymalaia',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Contato via WhatsApp'
    });
  }

  // If deal moved to "aguardando_pagamento" or beyond
  if (currentStageIndex >= 3 || deal.status === 'quitado') {
    currentTime = addHours(currentTime, 24);
    events.push({
      id: `hist-${deal.id}-stage-3`,
      type: 'stage_change',
      title: 'Mudança de etapa',
      actor: deal.owner || 'Ymalaia',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Em negociação → Aguardando pagamento',
      details: { fromStage: 'em_negociacao', toStage: 'aguardando_pagamento' }
    });

    currentTime = addHours(currentTime, 1.5);
    events.push({
      id: `hist-${deal.id}-act-3`,
      type: 'activity_added',
      title: 'Atividade registrada',
      actor: deal.owner || 'Ymalaia',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Chave PIX enviada para quitação'
    });
  }

  // If final: quitado
  if (deal.status === 'quitado') {
    currentTime = addHours(currentTime, 22);
    events.push({
      id: `hist-${deal.id}-quitado`,
      type: 'status_closed',
      title: 'Negócio quitado',
      actor: 'Sistema Financeiro',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Etapa final: Quitado (Pagamento integral conciliado)',
      details: { toStage: 'quitado' }
    });
  }

  // If final: encerrado_sem_pagamento
  if (deal.status === 'encerrado_sem_pagamento') {
    currentTime = addHours(currentTime, 12);
    events.push({
      id: `hist-${deal.id}-encerrado`,
      type: 'status_closed',
      title: 'Negócio encerrado',
      actor: deal.owner || 'Ymalaia',
      timestamp: formatDateTimeBR(currentTime),
      description: 'Etapa final: Encerrado sem pagamento (Esgotadas tentativas amigáveis)',
      details: { toStage: 'encerrado_sem_pagamento' }
    });
  }

  return events;
}

/**
 * Returns the history for a deal, using persisted deal.history if available
 * or lazily generating the mock history based on deal's progression.
 */
export function getDealHistory(deal: Deal): HistoryEvent[] {
  if (deal.history && deal.history.length > 0) {
    return deal.history;
  }
  return generateMockHistoryForDeal(deal);
}
