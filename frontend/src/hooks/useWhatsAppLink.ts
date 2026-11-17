import { useContext } from 'react';
import { WhatsAppLinkContext } from '../contexts/whatsAppLinkContext';

export const useWhatsAppLink = () => {
  const context = useContext(WhatsAppLinkContext);
  if (!context) {
    throw new Error('useWhatsAppLink deve ser usado dentro de WhatsAppLinkProvider.');
  }
  return context;
};
