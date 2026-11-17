export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const getNameInitial = (name?: string | null) => {
  const normalizedName = name?.trim();

  return normalizedName
    ? normalizedName.charAt(0).toLocaleUpperCase('pt-BR')
    : '?';
};

export interface WhatsAppLinkOptions {
  sisnetsulAtiva?: boolean;
  canalOrigem?: string;
}

export const getWhatsAppLink = (
  phone: string,
  text?: string,
  options?: WhatsAppLinkOptions,
) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const internationalNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  if (options?.sisnetsulAtiva && options.canalOrigem?.trim()) {
    const canalOrigem = options.canalOrigem.replace(/\D/g, '');
    return `https://whats.sisnetsul.com.br:4299/chat/${internationalNumber}/${canalOrigem}`;
  }

  const encodedText = text ? encodeURIComponent(text) : '';

  return `https://wa.me/${internationalNumber}${encodedText ? `?text=${encodedText}` : ''}`;
};
