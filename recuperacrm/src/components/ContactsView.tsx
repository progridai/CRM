import React, { useState } from 'react';
import { Search, User, MessageCircle, Phone, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { Contact } from '../types';
import { formatCurrency, getWhatsAppLink, formatPersonName } from '../utils';

interface ContactsViewProps {
  contacts: Contact[];
  onSelectContact?: (contact: Contact) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ contacts }) => {
  const [search, setSearch] = useState('');

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search) ||
      c.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Contatos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filteredContacts.length} {filteredContacts.length === 1 ? 'contato encontrado' : 'contatos encontrados'}
          </p>
        </div>

        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Table of contacts */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3.5">Nome Completo / Razão</th>
              <th className="p-3.5">CPF / CNPJ</th>
              <th className="p-3.5">Telefone Principal</th>
              <th className="p-3.5">Origem</th>
              <th className="p-3.5">Total em Débito</th>
              <th className="p-3.5">Status Geral</th>
              <th className="p-3.5 text-right">Ação Direta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                  <span>{formatPersonName(contact.name)}</span>
                </td>
                <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                  {contact.document}
                </td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                  {contact.phone}
                </td>
                <td className="p-3.5 text-slate-600 dark:text-slate-300">
                  {contact.origin}
                </td>
                <td className="p-3.5 font-display font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(contact.totalDebt)}
                </td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {contact.status}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <a
                    href={getWhatsAppLink(contact.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white/20" strokeWidth={2.2} />
                    <span>WhatsApp</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
