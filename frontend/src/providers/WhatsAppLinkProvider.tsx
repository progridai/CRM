import React, { useEffect, useMemo, useState } from 'react';
import { WhatsAppLinkContext } from '../contexts/whatsAppLinkContext';
import { obterConfiguracaoAtalhoWhatsApp, type WhatsAppAtalhoConfiguracaoDto } from '../services/whatsappService';
import { getWhatsAppLink as buildWhatsAppLink } from '../utils';

const CONFIGURACAO_PADRAO: WhatsAppAtalhoConfiguracaoDto = {
  ativo: true,
  canal: '551140002908',
};

export const WhatsAppLinkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [configuracao, setConfiguracao] = useState(CONFIGURACAO_PADRAO);

  useEffect(() => {
    let active = true;

    obterConfiguracaoAtalhoWhatsApp()
      .then((data) => {
        if (active) setConfiguracao(data);
      })
      .catch(() => {
        // O padrão temporário solicitado continua apontando para a Sisnet Sul.
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    getWhatsAppLink: (phone: string, text?: string) => buildWhatsAppLink(phone, text, {
      sisnetsulAtiva: configuracao.ativo,
      canalOrigem: configuracao.canal,
    }),
  }), [configuracao]);

  return (
    <WhatsAppLinkContext.Provider value={value}>
      {children}
    </WhatsAppLinkContext.Provider>
  );
};
