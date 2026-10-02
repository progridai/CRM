import React, { useState, useEffect } from 'react';
import { Search, X, User, ArrowRight, Plus } from 'lucide-react';
import { Deal, Contact } from '../types';
import { formatCurrency, formatPersonName, getOwnerAvatarColor } from '../utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  deals: Deal[];
  contacts: Contact[];
  onSelectDeal: (deal: Deal) => void;
  onOpenNewDealModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  deals,
  contacts,
  onSelectDeal,
  onOpenNewDealModal
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const filteredDeals = deals.filter(
    (d) =>
      d.clientName.toLowerCase().includes(normalizedQuery) ||
      d.document.includes(normalizedQuery) ||
      d.reference.includes(normalizedQuery) ||
      d.phone.includes(normalizedQuery)
  );

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(normalizedQuery) ||
      c.document.includes(normalizedQuery) ||
      c.phone.includes(normalizedQuery)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar devedor por nome, CPF/CNPJ, ref # ou telefone"
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 cursor-pointer"
            >
              Limpar
            </button>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action shortcut banner */}
        <div className="px-4 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100/80 dark:border-indigo-800/60 flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Ação Rápida:</span>
            <span>Cadastre um novo caso no pipeline de cobrança</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenNewDealModal();
            }}
            className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-2xs border border-indigo-200 dark:border-indigo-700 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar negócio</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Deals results */}
          {filteredDeals.length > 0 && (
            <div className="py-2">
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Negócios no Pipeline ({filteredDeals.length})
              </div>
              {filteredDeals.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => {
                    onSelectDeal(deal);
                    onClose();
                  }}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${
                        getOwnerAvatarColor(deal.owner, deal.ownerAvatar).badge
                      }`}
                      title={`Responsável: ${deal.owner}`}
                    >
                      {deal.ownerAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {formatPersonName(deal.clientName)}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          Ref #{deal.reference}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{deal.phone}</span>
                        <span>•</span>
                        <span>{deal.origin}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrency(deal.amount)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contacts results */}
          {filteredContacts.length > 0 && (
            <div className="py-2">
              <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Devedores / Contatos ({filteredContacts.length})
              </div>
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="w-full px-3 py-2 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block">
                        {formatPersonName(contact.name)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Doc: {contact.document} • {contact.phone}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Débito: {formatCurrency(contact.totalDebt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {filteredDeals.length === 0 && filteredContacts.length === 0 && (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">
                Nenhum registro encontrado para &quot;{query}&quot;
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Tente pesquisar por nome, CPF ou número de telefone
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">↑</kbd>{' '}
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">↓</kbd> para
              navegar
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">Enter</kbd>{' '}
              para abrir
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">Esc</kbd>{' '}
              para fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
