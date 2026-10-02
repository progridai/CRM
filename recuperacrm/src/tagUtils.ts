export interface TagDef {
  name: string;
  badgeClass: string;
}

export const DEFAULT_TAGS: TagDef[] = [
  { name: 'Pix gerado', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80' },
  { name: 'Boleto enviado', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80' },
  { name: 'Comprovante recebido', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
  { name: 'Aguardando comprovante', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80' },
  { name: 'Proposta enviada', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80' },
  { name: 'Retorno agendado', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80' }
];

export const TAG_COLOR_OPTIONS = [
  { label: 'Índigo', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dotClass: 'bg-indigo-500' },
  { label: 'Azul', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80', dotClass: 'bg-sky-500' },
  { label: 'Verde', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dotClass: 'bg-emerald-500' },
  { label: 'Âmbar', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80', dotClass: 'bg-amber-500' },
  { label: 'Roxo', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80', dotClass: 'bg-purple-500' },
  { label: 'Rosa', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80', dotClass: 'bg-rose-500' },
  { label: 'Ciano', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200/80', dotClass: 'bg-teal-500' },
  { label: 'Cinza', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-500' }
];

export function getCustomTags(): TagDef[] {
  try {
    const saved = localStorage.getItem('recupera_crm_custom_tags');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load custom tags', e);
  }
  return [];
}

export function saveCustomTag(tag: TagDef): TagDef[] {
  const existing = getCustomTags();
  const filtered = existing.filter(
    (t) => t.name.toLowerCase().trim() !== tag.name.toLowerCase().trim()
  );
  const updated = [...filtered, tag];
  localStorage.setItem('recupera_crm_custom_tags', JSON.stringify(updated));
  return updated;
}

export function getAllTags(): TagDef[] {
  const custom = getCustomTags();
  const all = [...DEFAULT_TAGS];
  for (const c of custom) {
    if (!all.some((a) => a.name.toLowerCase().trim() === c.name.toLowerCase().trim())) {
      all.push(c);
    }
  }
  return all;
}

export function getTagBadgeClass(tagName: string | undefined): string {
  if (!tagName) return '';
  const all = getAllTags();
  const found = all.find(
    (t) => t.name.toLowerCase().trim() === tagName.toLowerCase().trim()
  );
  if (found) return found.badgeClass;
  return 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
}
