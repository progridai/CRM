import React from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import type { EtapaDto, NegocioDto } from '../../services/negociosService';
import { formatCurrency, getNameInitial } from '../../utils';

interface NegociosListViewProps {
  negocios: NegocioDto[];
  etapas: EtapaDto[];
  onSelectNegocio: (negocio: NegocioDto) => void;
  onUpdateEtapa: (negocioPublicId: string, etapaCodigo: string) => void;
}

const formatPhone = (phone?: string) => {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
};

const formatDocument = (document?: string) => {
  if (!document) return '—';
  const digits = document.replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return document;
};

const getWhatsAppUrl = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  const internationalNumber = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${internationalNumber}`;
};

const withOpacity = (color: string, opacity: string) =>
  /^#[0-9a-f]{6}$/i.test(color) ? `${color}${opacity}` : color;

export const NegociosListView: React.FC<NegociosListViewProps> = ({
  negocios,
  etapas,
  onSelectNegocio,
  onUpdateEtapa,
}) => {
  if (negocios.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-sm text-slate-400 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
        Nenhum negócio encontrado para os filtros selecionados.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
              <th className="p-3 pl-4">Cliente / Devedor</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Valor do Débito</th>
              <th className="p-3">Etapa do Pipeline</th>
              <th className="p-3">Responsável</th>
              <th className="p-3 pr-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {negocios.map((negocio) => {
              const etapaAtual = etapas.find((etapa) => etapa.codigo === negocio.etapaCodigo);
              const stageColor = etapaAtual?.corHex || '#64748b';
              const nomeOperador = negocio.nomeOperador?.trim() || 'Sem responsável';

              return (
                <tr
                  key={negocio.publicId}
                  onClick={() => onSelectNegocio(negocio)}
                  className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                >
                  <td className="p-3 pl-4 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="max-w-64 truncate font-semibold transition-colors hover:text-indigo-600 dark:hover:text-indigo-400">
                        {negocio.nomeCliente}
                      </span>
                      {negocio.referencia && (
                        <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          #{negocio.referencia}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    {negocio.telefonePrincipal ? (
                      <a
                        href={getWhatsAppUrl(negocio.telefonePrincipal)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="group -ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-0.5 font-medium text-slate-700 transition-all hover:bg-emerald-50 hover:text-[#25D366] dark:text-slate-300 dark:hover:bg-emerald-950/40"
                        title="Conversar no WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 fill-[#25D366]/20 text-[#25D366]" strokeWidth={2.2} />
                        <span>{formatPhone(negocio.telefonePrincipal)}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </td>

                  <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {formatDocument(negocio.documento)}
                  </td>

                  <td className="max-w-[180px] truncate p-3 text-slate-600 dark:text-slate-300" title={negocio.origem || undefined}>
                    {negocio.origem || '—'}
                  </td>

                  <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(negocio.valor)}
                  </td>

                  <td className="p-3" onClick={(event) => event.stopPropagation()}>
                    <select
                      aria-label={`Alterar etapa de ${negocio.nomeCliente}`}
                      value={negocio.etapaCodigo}
                      onChange={(event) => onUpdateEtapa(negocio.publicId, event.target.value)}
                      className="max-w-52 cursor-pointer rounded-full border px-2 py-1 text-[11px] font-semibold outline-none"
                      style={{
                        color: stageColor,
                        borderColor: withOpacity(stageColor, '55'),
                        backgroundColor: withOpacity(stageColor, '18'),
                      }}
                    >
                      {etapas.map((etapa) => (
                        <option key={etapa.publicId} value={etapa.codigo} className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                          {etapa.nome}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300"
                        title={`Responsável: ${nomeOperador}`}
                      >
                        {getNameInitial(negocio.nomeOperador)}
                      </div>
                      <span className="max-w-36 truncate text-[11px] text-slate-700 dark:text-slate-300">
                        {nomeOperador}
                      </span>
                    </div>
                  </td>

                  <td className="p-3 pr-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectNegocio(negocio);
                      }}
                      aria-label={`Abrir negócio de ${negocio.nomeCliente}`}
                      title="Abrir negócio"
                      className="cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
