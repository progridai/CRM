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
