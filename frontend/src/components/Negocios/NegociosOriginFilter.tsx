import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface NegociosOriginFilterProps {
  options: string[];
  selected: string[];
  onChange: (origins: string[]) => void;
}

export function NegociosOriginFilter({ options, selected, onChange }: NegociosOriginFilterProps) {
  const [open, setOpen] = useState(false);
  const filter = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const summary = selected.length === 0 ? 'Todas'
    : selected.length === 1 ? selected[0]
    : `${selected.length} selecionadas`;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !filter.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  return (
    <div
      ref={filter}
      className="2xl:relative"
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (!open || event.key !== 'Escape') return;
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Filtrar por origem: ${summary}`}
        onClick={() => setOpen(!open)}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 text-xs dark:border-slate-700/80 dark:bg-slate-800/80"
      >
        <span className="text-slate-400">Origem:</span>
        <span className="max-w-36 truncate font-semibold text-slate-800 dark:text-slate-100" title={summary}>
          {summary}
        </span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" />
      </button>
      {open && (
        <div id={panelId} className="absolute inset-x-3 top-full z-30 mt-1 max-w-md rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900 2xl:inset-x-auto 2xl:left-0 2xl:w-md">
          <div className="flex items-center justify-between gap-2 px-2 pb-2 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Origens</span>
            <button
              type="button"
              onClick={() => { if (selected.length) onChange([]); }}
              className="cursor-pointer font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Limpar seleção
            </button>
          </div>
          <fieldset className="max-h-64 overflow-y-auto overscroll-contain border-t border-slate-200 pt-1 dark:border-slate-700">
            <legend className="sr-only">Origens disponíveis</legend>
            {options.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">Nenhuma origem disponível.</p>}
            {options.map((origin) => (
              <label key={origin} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={selected.includes(origin)}
                  onChange={(event) => onChange(event.target.checked
                    ? [...selected, origin]
                    : selected.filter((item) => item !== origin))}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-indigo-600"
                />
                <span className="min-w-0 break-words">{origin}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}
