import type { NegocioDto } from '../../services/negociosService';

export interface NegociosFilters {
  search: string;
  mesCobranca: string;
  competence: string;
  origins: string[];
  owner: string;
}

export const DEFAULT_NEGOCIOS_FILTERS: NegociosFilters = {
  search: '',
  mesCobranca: 'Todos',
  competence: 'Todas',
  origins: [],
  owner: 'Todos',
};

const normalizeSearchValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export const getCompetenceValue = (negocio: NegocioDto) =>
  `${negocio.competenciaAno}-${String(negocio.competenciaMes).padStart(2, '0')}`;

export function formatarPeriodo(periodo: string) {
  const [ano, mes] = periodo.split('-');
  return `${mes}/${ano}`;
}

export function filterNegocios(
  negocios: NegocioDto[],
  filters: NegociosFilters,
): NegocioDto[] {
  const search = normalizeSearchValue(filters.search.trim());
  const origins = new Set(filters.origins);

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

    const matchesMesCobranca = filters.mesCobranca === 'Todos' ||
      negocio.mesesCobranca.includes(filters.mesCobranca);

    const matchesOrigin =
      origins.size === 0 ||
      (negocio.origem != null && origins.has(negocio.origem));

    const matchesOwner =
      filters.owner === 'Todos' || negocio.nomeOperador === filters.owner;

    return matchesSearch && matchesMesCobranca && matchesCompetence && matchesOrigin && matchesOwner;
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
