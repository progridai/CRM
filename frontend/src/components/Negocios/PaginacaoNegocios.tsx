interface PaginacaoNegociosProps {
  pagina: number;
  porPagina: number;
  total: number;
  unidade: string;
  onChange: (pagina: number) => void;
}

export function PaginacaoNegocios({ pagina, porPagina, total, unidade, onChange }: PaginacaoNegociosProps) {
  if (total <= porPagina) return null;

  const inicio = pagina * porPagina;
  const fim = Math.min(inicio + porPagina, total);
  const classeBotao = 'rounded-md border border-slate-200 px-2 py-1.5 disabled:opacity-40 dark:border-slate-700';

  return (
    <nav aria-label={`Paginação de ${unidade}`} className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300">
      <button type="button" className={classeBotao} disabled={!pagina} onClick={() => onChange(pagina - 1)}>Anterior</button>
      <span aria-live="polite">{inicio + 1}–{fim} de {total}</span>
      <button type="button" className={classeBotao} disabled={fim >= total} onClick={() => onChange(pagina + 1)}>Próxima</button>
    </nav>
  );
}
