import React from 'react';
import {
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { Deal, DealStage } from '../types';
import { formatCurrency, getWhatsAppLink, getOwnerAvatarColor, formatPersonName } from '../utils';
import { STAGE_CONFIG } from '../mockData';

interface ListViewProps {
  deals: Deal[];
  onSelectDeal: (deal: Deal) => void;
  onUpdateDealStage: (dealId: string, newStage: DealStage) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  deals,
  onSelectDeal,
  onUpdateDealStage
}) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3 pl-4">Cliente / Devedor</th>
              <th className="p-3">Telefone</th>
              <th className="p-3">Documento</th>
              <th className="p-3">Origem</th>
              <th className="p-3">Valor do Débito</th>
              <th className="p-3">Etapa do Pipeline</th>
              <th className="p-3">Responsável</th>
              <th className="p-3 text-right pr-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {deals.map((deal) => {
              const stage = STAGE_CONFIG[deal.status] || STAGE_CONFIG.novo;

              return (
                <tr
                  key={deal.id}
                  onClick={() => onSelectDeal(deal)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="p-3 pl-4 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                       <span className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {formatPersonName(deal.clientName)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        #{deal.reference}
                      </span>
                    </div>
                  </td>

                  <td className="p-3">
                    <a
                      href={getWhatsAppLink(deal.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 py-0.5 px-2 -ml-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:text-[#25D366] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium transition-all cursor-pointer group"
                      title="Conversar no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/20 shrink-0" strokeWidth={2.2} />
                      <span>{deal.phone}</span>
                    </a>
                  </td>

                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                    {deal.document}
                  </td>

                  <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                    {deal.origin}
                  </td>

                  <td className="p-3 font-display font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(deal.amount)}
                  </td>

                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={deal.status}
                      onChange={(e) =>
                        onUpdateDealStage(deal.id, e.target.value as DealStage)
                      }
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full border outline-none cursor-pointer ${stage.badgeClass}`}
                    >
                      <option value="nova_posicao">Nova posição</option>
                      <option value="contato_em_andamento">Contato em andamento</option>
                      <option value="em_negociacao">Em negociação</option>
                      <option value="aguardando_pagamento">Aguardando pagamento</option>
                      <option value="encerrado_sem_pagamento">Encerrado sem pagamento</option>
                      <option value="quitado">Quitado</option>
                    </select>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                          getOwnerAvatarColor(deal.owner, deal.ownerAvatar).badge
                        }`}
                      >
                        {deal.ownerAvatar}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 text-[11px]">{deal.owner}</span>
                    </div>
                  </td>

                  <td className="p-3 pr-4 text-right">
                    <button
                      onClick={() => onSelectDeal(deal)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
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
