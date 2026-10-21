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

export const getWhatsAppLink = (phone: string, text?: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const internationalNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  const encodedText = text ? encodeURIComponent(text) : '';

  return `https://wa.me/${internationalNumber}${encodedText ? `?text=${encodedText}` : ''}`;
};
