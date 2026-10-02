import { useState, useEffect } from 'react';

export interface QuickActivityTemplate {
  id: string;
  channel: 'whatsapp' | 'call' | 'payment' | 'note';
  channelLabel: string;
  title: string;
  description: string;
  isCustom?: boolean;
}

export const DEFAULT_TEMPLATES: QuickActivityTemplate[] = [
  {
    id: 'wpp_cobranca',
    channel: 'whatsapp',
    channelLabel: 'WhatsApp',
    title: 'Mensagem de cobrança enviada',
    description: 'Mensagem de cobrança enviada'
  },
  {
    id: 'wpp_proposta',
    channel: 'whatsapp',
    channelLabel: 'WhatsApp',
    title: 'Proposta de acordo enviada',
    description: 'Proposta de acordo enviada'
  },
  {
    id: 'wpp_comprovante',
    channel: 'whatsapp',
    channelLabel: 'WhatsApp',
    title: 'Comprovante solicitado',
    description: 'Comprovante solicitado'
  },
  {
    id: 'lig_sem_atendimento',
    channel: 'call',
    channelLabel: 'Ligação',
    title: 'Tentativa sem atendimento',
    description: 'Tentativa sem atendimento'
  },
  {
    id: 'lig_pediu_retorno',
    channel: 'call',
    channelLabel: 'Ligação',
    title: 'Cliente pediu retorno',
    description: 'Cliente pediu retorno'
  },
  {
    id: 'lig_promessa',
    channel: 'call',
    channelLabel: 'Ligação',
    title: 'Promessa de pagamento acordada',
    description: 'Promessa de pagamento acordada'
  },
  {
    id: 'pag_confirmado',
    channel: 'payment',
    channelLabel: 'Pagamento',
    title: 'Pagamento confirmado',
    description: 'Pagamento confirmado'
  }
];

export const TEMPLATES_STORAGE_KEY = 'recuperacrm_quick_activity_templates_v2';

export function getStoredTemplates(): QuickActivityTemplate[] {
  try {
    const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Migração de versões anteriores se houver
    const oldCustom = localStorage.getItem('recuperacrm_custom_quick_activities');
    if (oldCustom) {
      try {
        const parsedOld = JSON.parse(oldCustom);
        if (Array.isArray(parsedOld) && parsedOld.length > 0) {
          const combined = [...DEFAULT_TEMPLATES, ...parsedOld];
          localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(combined));
          return combined;
        }
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.error('Error reading quick activity templates', err);
  }
  return DEFAULT_TEMPLATES;
}

export function saveStoredTemplates(templates: QuickActivityTemplate[]) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    window.dispatchEvent(new CustomEvent('quick-activities-updated', { detail: templates }));
  } catch (err) {
    console.error('Error saving quick activity templates', err);
  }
}

export function useQuickActivityTemplates() {
  const [templates, setTemplates] = useState<QuickActivityTemplate[]>(getStoredTemplates);

  useEffect(() => {
    const handleUpdate = () => {
      setTemplates(getStoredTemplates());
    };

    window.addEventListener('quick-activities-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('quick-activities-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addTemplate = (newTpl: Omit<QuickActivityTemplate, 'id'>) => {
    const id = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullTpl: QuickActivityTemplate = {
      ...newTpl,
      id,
      isCustom: true
    };
    const next = [...templates, fullTpl];
    setTemplates(next);
    saveStoredTemplates(next);
    return fullTpl;
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveStoredTemplates(next);
  };

  const resetToDefaults = () => {
    setTemplates(DEFAULT_TEMPLATES);
    saveStoredTemplates(DEFAULT_TEMPLATES);
  };

  return {
    templates,
    addTemplate,
    deleteTemplate,
    resetToDefaults
  };
}
