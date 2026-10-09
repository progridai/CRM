import type { NegocioDto } from '../../services/negociosService';

export interface NegociosFilters {
  search: string;
  competence: string;
  origin: string;
  owner: string;
}

export const DEFAULT_NEGOCIOS_FILTERS: NegociosFilters = {
  search: '',
  competence: 'Todas',
  origin: 'Todas',
  owner: 'Todos',
};

const normalizeSearchValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const getCompetenceValue = (negocio: NegocioDto) =>
  `${negocio.competenciaAno}-${String(negocio.competenciaMes).padStart(2, '0')}`;

export function filterNegocios(
  negocios: NegocioDto[],
  filters: NegociosFilters,
): NegocioDto[] {
  const search = normalizeSearchValue(filters.search.trim());

  return negocios.filter((negocio) => {
    const matchesSearch = !search || [
      negocio.nomeCliente,
      negocio.documento,
      negocio.telefonePrincipal,
      negocio.referencia,
    ].some((value) => normalizeSearchValue(value).includes(search));

    const matchesCompetence =
      filters.competence === 'Todas' ||
      getCompetenceValue(negocio) === filters.competence;

    const matchesOrigin =
      filters.origin === 'Todas' ||
      (negocio.origem ?? '').includes(filters.origin);

    const matchesOwner =
      filters.owner === 'Todos' || negocio.nomeOperador === filters.owner;

    return matchesSearch && matchesCompetence && matchesOrigin && matchesOwner;
  });
}

export function computeIndicators(
  negocios: NegocioDto[],
) {
  const openDeals = negocios.filter((negocio) => negocio.etapaCodigo !== 'quitado');
  const recoveredDeals = negocios.filter((negocio) => negocio.etapaCodigo === 'quitado');
  const now = new Date();
  const recoveredThisMonthDeals = recoveredDeals.filter((negocio) => {
    if (!negocio.recuperadoEm) return false;
    const recoveredAt = new Date(negocio.recuperadoEm);
    return !Number.isNaN(recoveredAt.getTime()) &&
      recoveredAt.getFullYear() === now.getFullYear() &&
      recoveredAt.getMonth() === now.getMonth();
  });
  const waitingPaymentDeals = negocios.filter(
    (negocio) => negocio.etapaCodigo === 'aguardando_pagamento',
  );
  const noContactDeals = negocios.filter(
    (negocio) => negocio.etapaCodigo === 'nova_posicao',
  );

  const sumAmount = (items: NegocioDto[]) =>
    items.reduce((total, negocio) => total + negocio.valor, 0);

  const recoveredAmount = sumAmount(recoveredThisMonthDeals);
  const targetAmount = sumAmount(negocios);
  const targetPercent = targetAmount > 0
    ? Number(((recoveredAmount / targetAmount) * 100).toFixed(1))
    : 0;

  return {
    openAmount: sumAmount(openDeals),
    openCount: openDeals.length,
    recoveredAmount,
    recoveredCount: recoveredThisMonthDeals.length,
    waitingPaymentAmount: sumAmount(waitingPaymentDeals),
    waitingPaymentCount: waitingPaymentDeals.length,
    noContactAmount: sumAmount(noContactDeals),
    noContactCount: noContactDeals.length,
    targetAmount,
    targetPercent,
  };
}
