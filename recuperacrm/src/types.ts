export type DealStage =
  | 'nova_posicao'
  | 'contato_em_andamento'
  | 'em_negociacao'
  | 'aguardando_pagamento'
  | 'encerrado_sem_pagamento'
  | 'quitado';

export interface Activity {
  id: string;
  type: 'whatsapp' | 'call' | 'note' | 'payment' | 'system';
  title: string;
  description: string;
  author: string;
  timestamp: string;
}

export type HistoryEventType =
  | 'import'
  | 'stage_change'
  | 'activity_added'
  | 'activity_removed'
  | 'owner_change'
  | 'status_closed';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  title: string;
  actor: string;
  timestamp: string;
  description: string;
  details?: {
    fromStage?: string;
    toStage?: string;
    fromOwner?: string;
    toOwner?: string;
    activityType?: string;
  };
}

export interface Deal {
  id: string;
  clientName: string;
  phone: string;
  document: string; // CPF or CNPJ
  reference: string;
  contractNumber?: string; // Ex: '13231'
  reason?: string; // Ex: 'NÃO DESCONTOU'
  origin: string; // Ex: FAEC 82.014.171 AP DÉBITO - VENDAS NOVAS
  owner: string; // Ex: Helena
  ownerAvatar?: string;
  status: DealStage;
  statusBadge?: string; // Ex: 'Liquidado', 'Pix gerado'
  amount: number;
  competence: string; // Ex: 'Set/2026'
  commentCount: number;
  activities: Activity[];
  history?: HistoryEvent[];
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  document: string;
  email: string;
  origin: string;
  totalDebt: number;
  activeDealsCount: number;
  status: string;
}

export type ViewMode = 'kanban' | 'list';

export interface AppUser {
  id: string;
  name: string; // Ex: 'Helena' | 'Ymalaia'
  fullName: string; // Ex: 'Helena Soares' | 'Ymalaia Duarte'
  email: string;
  phone: string;
  role: string;
  avatar: string;
  avatarBg: string;
  activeDealsCount: number;
  recoveredDealsCount: number;
  recoveredThisMonth: number;
  targetAmount?: number;
  status: 'Ativo' | 'Inativo';
}
