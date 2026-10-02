import { Deal, Contact, DealStage, AppUser } from './types';

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'deal-1',
    clientName: 'Beatriz Carvalho',
    phone: '(41) 98842-1109',
    document: '449.123.899-20',
    reference: '09214',
    origin: 'FAEC / Educacional',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'nova_posicao',
    amount: 642.8,
    competence: 'Set/2026',
    commentCount: 0,
    activities: [],
    createdAt: '2026-09-01T09:00:00Z',
    updatedAt: '2026-09-01T09:12:00Z',
    notes: 'Cliente alega atraso no recebimento do salário. Promete retorno dia 15.'
  },
  {
    id: 'deal-2',
    clientName: 'Carlos Eduardo Silva',
    phone: '(11) 97120-4491',
    document: '109.847.220-41',
    reference: '08771',
    origin: 'VG Módulos',
    owner: 'Ymalaia',
    ownerAvatar: 'Y',
    status: 'nova_posicao',
    amount: 734.2,
    competence: 'Set/2026',
    commentCount: 0,
    activities: [],
    createdAt: '2026-09-02T11:30:00Z',
    updatedAt: '2026-09-02T11:30:00Z',
    notes: 'Primeira cobrança de VG.'
  },
  {
    id: 'deal-3-1',
    clientName: 'Mariana Fonseca',
    phone: '(31) 99871-3320',
    document: '581.332.906-88',
    reference: '11822-1',
    contractNumber: '11822',
    reason: 'NÃO DESCONTOU',
    origin: 'FAEC 82.019.221 AP DÉBITO',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'nova_posicao',
    amount: 518.4,
    competence: 'Set/2026',
    commentCount: 0,
    activities: [],
    createdAt: '2026-09-03T14:15:00Z',
    updatedAt: '2026-09-03T14:25:00Z',
    notes: 'Possibilidade de negociação com desconto à vista.'
  },
  {
    id: 'deal-3-2',
    clientName: 'Mariana Fonseca',
    phone: '(31) 99871-3320',
    document: '581.332.906-88',
    reference: '11822-2',
    contractNumber: '11822',
    reason: 'NÃO DESCONTOU',
    origin: 'FAEC 91.042.887 VG DÉBITO',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'nova_posicao',
    amount: 894.6,
    competence: 'Set/2026',
    commentCount: 0,
    activities: [],
    createdAt: '2026-09-03T14:15:00Z',
    updatedAt: '2026-09-03T14:25:00Z',
    notes: 'Possibilidade de negociação com desconto à vista.'
  },
  {
    id: 'deal-4-1',
    clientName: 'Adelmo Correia',
    phone: '(54) 99118-2033',
    document: '776.127.959-49',
    reference: '13231-1',
    contractNumber: '13231',
    reason: 'NÃO DESCONTOU',
    origin: 'FAEC 82.014.171 AP DÉBITO - VENDAS NOVAS',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'contato_em_andamento',
    amount: 101.15,
    competence: 'Set/2026',
    commentCount: 1,
    activities: [
      {
        id: 'act-4-1',
        type: 'call',
        title: 'Tentativa de Ligação',
        description: 'Caixa postal. Motivo de recusa: NÃO DESCONTOU (Título 1/3).',
        author: 'Helena',
        timestamp: '04/09/2026 10:00'
      }
    ],
    createdAt: '2026-09-04T09:00:00Z',
    updatedAt: '2026-09-04T10:05:00Z',
    notes: 'Título 1/3 - Parcela vencida. FAEC 82.014.171 AP DÉBITO.'
  },
  {
    id: 'deal-4-2',
    clientName: 'Adelmo Correia',
    phone: '(54) 99118-2033',
    document: '776.127.959-49',
    reference: '13231-2',
    contractNumber: '13231',
    reason: 'NÃO DESCONTOU',
    origin: 'FAEC 82.063.444 ICATU DÉBITO - ENCAMPAÇÃO ZURICH',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'contato_em_andamento',
    amount: 15.17,
    competence: 'Set/2026',
    commentCount: 1,
    activities: [
      {
        id: 'act-4-2',
        type: 'whatsapp',
        title: 'Mensagem WhatsApp Enviada',
        description: 'Notificação enviada ref. título 2/3 (R$ 15,17). Motivo: NÃO DESCONTOU.',
        author: 'Helena',
        timestamp: '04/09/2026 10:05'
      }
    ],
    createdAt: '2026-09-04T09:00:00Z',
    updatedAt: '2026-09-04T10:05:00Z',
    notes: 'Título 2/3 - Parcela vencida. FAEC 82.063.444 ICATU DÉBITO.'
  },
  {
    id: 'deal-4-3',
    clientName: 'Adelmo Correia',
    phone: '(54) 99118-2033',
    document: '776.127.959-49',
    reference: '13231-3',
    contractNumber: '13231',
    reason: 'NÃO DESCONTOU',
    origin: 'FAEC 93.104.433 VG DÉBITO - VENDAS NOVAS',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'contato_em_andamento',
    amount: 281.0,
    competence: 'Set/2026',
    commentCount: 0,
    activities: [],
    createdAt: '2026-09-04T09:00:00Z',
    updatedAt: '2026-09-04T10:05:00Z',
    notes: 'Título 3/3 - Parcela vencida. FAEC 93.104.433 VG DÉBITO.'
  },
  {
    id: 'deal-5',
    clientName: 'Gabriel Monteiro',
    phone: '(19) 98112-9090',
    document: '381.992.012-77',
    reference: '14201',
    origin: 'Educa Mais',
    owner: 'Ymalaia',
    ownerAvatar: 'Y',
    status: 'contato_em_andamento',
    amount: 1420.5,
    competence: 'Set/2026',
    commentCount: 1,
    activities: [
      {
        id: 'act-5-1',
        type: 'call',
        title: 'Ligação não atendida',
        description: 'Número chamou até cair. Enviado SMS e WhatsApp.',
        author: 'Ymalaia',
        timestamp: '05/09/2026 15:30'
      }
    ],
    createdAt: '2026-09-05T14:00:00Z',
    updatedAt: '2026-09-05T15:30:00Z',
    notes: 'Contato em andamento pelo WhatsApp.'
  },
  {
    id: 'deal-6',
    clientName: 'Juliana Pereira Lima',
    phone: '(48) 99182-4411',
    document: '028.914.881-30',
    reference: '08129',
    origin: 'FAEC / VG Módulos',
    owner: 'Ymalaia',
    ownerAvatar: 'Y',
    status: 'em_negociacao',
    amount: 835.9,
    competence: 'Set/2026',
    commentCount: 2,
    activities: [
      {
        id: 'act-6-1',
        type: 'whatsapp',
        title: 'Contato Estabelecido via WhatsApp',
        description: 'Devedora confirmou recebimento do demonstrativo de dívida.',
        author: 'Ymalaia',
        timestamp: '06/09/2026 11:20'
      },
      {
        id: 'act-6-2',
        type: 'note',
        title: 'Solicitação de Proposta',
        description: 'Pediu simulação parcelada em 3x sem juros.',
        author: 'Ymalaia',
        timestamp: '06/09/2026 11:45'
      }
    ],
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-06T11:45:00Z',
    notes: 'Tem interesse em quitar mas precisa parcelar em 3 vezes.'
  },
  {
    id: 'deal-7',
    clientName: 'Adauri Govani Frescura',
    phone: '(51) 99932-7142',
    document: '323.156.940-00',
    reference: '14299',
    origin: 'FAEC / VG Módulos',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'em_negociacao',
    amount: 620.45,
    competence: 'Set/2026',
    commentCount: 3,
    activities: [
      {
        id: 'act-7-1',
        type: 'whatsapp',
        title: 'Conversa WhatsApp',
        description: 'Acordo prévio fechado para quitação em parcela única com desconto.',
        author: 'Helena',
        timestamp: '07/09/2026 09:30'
      },
      {
        id: 'act-7-2',
        type: 'note',
        title: 'Acordo Pré-aprovado',
        description: 'Valor ajustado de R$ 700,00 para R$ 620,45 mediante chave PIX.',
        author: 'Helena',
        timestamp: '07/09/2026 10:15'
      },
      {
        id: 'act-7-3',
        type: 'whatsapp',
        title: 'PIX e Instruções Enviadas',
        description: 'Código Copia e Cola enviado no WhatsApp.',
        author: 'Helena',
        timestamp: '07/09/2026 10:20'
      }
    ],
    createdAt: '2026-09-06T08:00:00Z',
    updatedAt: '2026-09-07T10:20:00Z',
    notes: 'Cliente solicitou chave PIX para liquidar até às 17h.'
  },
  {
    id: 'deal-8',
    clientName: 'Renata Lisboa Alves',
    phone: '(21) 97720-3301',
    document: '089.123.551-09',
    reference: '10920',
    origin: 'FAEC / Contratos',
    owner: 'Ymalaia',
    ownerAvatar: 'Y',
    status: 'aguardando_pagamento',
    statusBadge: 'Pix gerado',
    amount: 1950.0,
    competence: 'Set/2026',
    commentCount: 2,
    activities: [
      {
        id: 'act-8-1',
        type: 'note',
        title: 'Acordo Formalizado',
        description: 'Termo de confissão de dívida emitido com vencimento amanhã.',
        author: 'Ymalaia',
        timestamp: '07/09/2026 16:00'
      },
      {
        id: 'act-8-2',
        type: 'whatsapp',
        title: 'Envio de Chave PIX Dinâmica',
        description: 'Chave gerada no valor de R$ 1.950,00.',
        author: 'Ymalaia',
        timestamp: '07/09/2026 16:10'
      }
    ],
    createdAt: '2026-09-05T09:00:00Z',
    updatedAt: '2026-09-07T16:10:00Z',
    notes: 'Aguardando validação do pagamento para dar baixa definitiva.'
  },
  {
    id: 'deal-9',
    clientName: 'Valdir Pinheiro Machado',
    phone: '(51) 98450-0012',
    document: '441.982.700-11',
    reference: '07812',
    origin: 'VG Módulos',
    owner: 'Helena',
    ownerAvatar: 'H',
    status: 'quitado',
    amount: 2450.0,
    competence: 'Set/2026',
    commentCount: 2,
    activities: [
      {
        id: 'act-9-1',
        type: 'payment',
        title: 'Pagamento Integral Confirmado',
        description: 'TED de R$ 2.450,00 identificada e conciliada no extrato.',
        author: 'Sistema Financeiro',
        timestamp: '08/09/2026 14:00'
      },
      {
        id: 'act-9-2',
        type: 'note',
        title: 'Baixa de Restrição e Quitação',
        description: 'Comando de desapontamento enviado para bureaus de crédito e recibo expedido.',
        author: 'Helena',
        timestamp: '08/09/2026 14:30'
      }
    ],
    createdAt: '2026-09-01T08:00:00Z',
    updatedAt: '2026-09-08T14:30:00Z',
    notes: 'Dívida 100% quitada.'
  },
  {
    id: 'deal-10',
    clientName: 'Marcos Vinicius Dias',
    phone: '(11) 98223-1199',
    document: '190.231.550-99',
    reference: '06540',
    origin: 'VG Contratos',
    owner: 'Ymalaia',
    ownerAvatar: 'Y',
    status: 'encerrado_sem_pagamento',
    amount: 3200.0,
    competence: 'Set/2026',
    commentCount: 2,
    activities: [
      {
        id: 'act-10-1',
        type: 'call',
        title: 'Recusa Explícita',
        description: 'Devedor recusa negociação amigável. Encaminhado para jurídico externo.',
        author: 'Ymalaia',
        timestamp: '02/09/2026 16:40'
      },
      {
        id: 'act-10-2',
        type: 'note',
        title: 'Encaminhado ao Jurídico Contencioso',
        description: 'Contrato transferido para cobrança contenciosa após esgotamento das tentativas amigáveis.',
        author: 'Helena',
        timestamp: '02/09/2026 17:00'
      }
    ],
    createdAt: '2026-08-28T10:00:00Z',
    updatedAt: '2026-09-02T17:00:00Z',
    notes: 'Transferido para o contencioso judicial.'
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'c-1',
    name: 'Adauri Govani Frescura',
    phone: '(51) 99932-7142',
    document: '323.156.940-00',
    email: 'adauri.frescura@gmail.com',
    origin: 'FAEC / VG Módulos',
    totalDebt: 620.45,
    activeDealsCount: 1,
    status: 'Em negociação'
  },
  {
    id: 'c-2',
    name: 'Beatriz Carvalho',
    phone: '(41) 98842-1109',
    document: '449.123.899-20',
    email: 'beatriz.c@outlook.com',
    origin: 'FAEC / Educacional',
    totalDebt: 642.8,
    activeDealsCount: 1,
    status: 'Novo'
  },
  {
    id: 'c-3',
    name: 'Valdir Pinheiro Machado',
    phone: '(51) 98450-0012',
    document: '441.982.700-11',
    email: 'valdir.machado@empresa.com.br',
    origin: 'VG Módulos',
    totalDebt: 2450.0,
    activeDealsCount: 1,
    status: 'Liquidado'
  },
  {
    id: 'c-4',
    name: 'Renata Lisboa Alves',
    phone: '(21) 97720-3301',
    document: '089.123.551-09',
    email: 'renata.lisboa@hotmail.com',
    origin: 'FAEC / Contratos',
    totalDebt: 1950.0,
    activeDealsCount: 1,
    status: 'Aguardando pagamento'
  },
  {
    id: 'c-5',
    name: 'Adelmo Correia',
    phone: '(54) 99118-2033',
    document: '776.127.959-49',
    email: 'adelmo.correia@uol.com.br',
    origin: 'FAEC DÉBITO',
    totalDebt: 397.32,
    activeDealsCount: 3,
    status: 'Em andamento'
  },
  {
    id: 'c-6',
    name: 'Mariana Fonseca',
    phone: '(31) 99871-3320',
    document: '581.332.906-88',
    email: 'mariana.fonseca@gmail.com',
    origin: 'FAEC DÉBITO',
    totalDebt: 1413.0,
    activeDealsCount: 2,
    status: 'Novo'
  }
];

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'user-1',
    name: 'Helena',
    fullName: 'Helena Soares',
    email: 'helena.soares@progrid.com',
    phone: '(11) 98112-4450',
    role: 'Negociadora Sênior',
    avatar: 'H',
    avatarBg: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    activeDealsCount: 7,
    recoveredDealsCount: 1,
    recoveredThisMonth: 2450.0,
    targetAmount: 25000.0,
    status: 'Ativo'
  },
  {
    id: 'user-2',
    name: 'Ymalaia',
    fullName: 'Ymalaia Duarte',
    email: 'ymalaia.duarte@progrid.com',
    phone: '(11) 97330-8812',
    role: 'Negociadora Pleno',
    avatar: 'Y',
    avatarBg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    activeDealsCount: 5,
    recoveredDealsCount: 0,
    recoveredThisMonth: 0.0,
    targetAmount: 20000.0,
    status: 'Ativo'
  }
];

export const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; dotClass: string; badgeClass: string }
> = {
  nova_posicao: {
    label: 'Nova posição',
    color: '#6366f1',
    dotClass: 'bg-indigo-400',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  contato_em_andamento: {
    label: 'Contato em andamento',
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  em_negociacao: {
    label: 'Em negociação',
    color: '#8b5cf6',
    dotClass: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  aguardando_pagamento: {
    label: 'Aguardando pagamento',
    color: '#f59e0b',
    dotClass: 'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  encerrado_sem_pagamento: {
    label: 'Encerrado sem pagamento',
    color: '#dc2626',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300'
  },
  quitado: {
    label: 'Quitado',
    color: '#059669',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  // Legacy aliases for safe fallback
  novo: {
    label: 'Nova posição',
    color: '#6366f1',
    dotClass: 'bg-indigo-400',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  sem_contato: {
    label: 'Contato em andamento',
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  contato_realizado: {
    label: 'Contato em andamento',
    color: '#3b82f6',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  concluido: {
    label: 'Quitado',
    color: '#059669',
    dotClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  encerrado: {
    label: 'Encerrado sem pagamento',
    color: '#dc2626',
    dotClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300'
  }
};
