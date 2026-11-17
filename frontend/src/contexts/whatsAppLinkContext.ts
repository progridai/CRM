import { createContext } from 'react';

export interface WhatsAppLinkContextValue {
  getWhatsAppLink: (phone: string, text?: string) => string;
}

export const WhatsAppLinkContext = createContext<WhatsAppLinkContextValue | undefined>(undefined);
