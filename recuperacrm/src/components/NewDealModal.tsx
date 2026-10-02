import React, { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { Deal, DealStage } from '../types';
import { generateId, formatPersonName } from '../utils';

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDeal: (deal: Deal) => void;
}

export const NewDealModal: React.FC<NewDealModalProps> = ({
  isOpen,
  onClose,
  onCreateDeal
}) => {
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [competence, setCompetence] = useState('Set/2026');
  const [reference, setReference] = useState('');
  const [origin, setOrigin] = useState('FAEC / VG Módulos');
  const [owner, setOwner] = useState('Helena');
  const [status, setStatus] = useState<DealStage>('nova_posicao');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse amount
    const parsedAmount =
      parseFloat(amountStr.replace(/\./g, '').replace(',', '.')) || 100.0;

    const newDealId = generateId();
    const cleanRef =
      reference.trim() || Math.floor(10000 + Math.random() * 90000).toString();

    const newDeal: Deal = {
      id: newDealId,
      clientName: formatPersonName(clientName.trim()),
      phone: phone.trim(),
      document: documentNumber.trim() || '000.000.000-00',
      reference: cleanRef,
      origin,
      owner,
      ownerAvatar: owner === 'Helena' ? 'H' : 'Y',
      status,
      amount: parsedAmount,
      competence,
      commentCount: 0,
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes.trim()
    };

    onCreateDeal(newDeal);
    onClose();

    // reset fields
    setClientName('');
    setPhone('');
    setAmountStr('');
    setReference('');
    setDocumentNumber('');
    setNotes('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-150 max-h-[95vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                Criar Novo Negócio
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insira as informações essenciais para abrir a cobrança no pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome do Cliente / Devedor *
            </label>
            <input
              type="text"
              required
              placeholder="Nome completo ou Razão Social"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telefone WhatsApp *
              </label>
              <input
                type="text"
                required
                placeholder="(41) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Valor do Débito (R$) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 1.450,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 font-bold outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Documento (CPF ou CNPJ)
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Referência Externa
              </label>
              <input
                type="text"
                placeholder="Ex: 14299"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Competência
              </label>
              <select
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="Set/2026">Set/2026</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Etapa Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DealStage)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 font-medium cursor-pointer"
              >
                <option value="nova_posicao">Nova posição</option>
                <option value="contato_em_andamento">Contato em andamento</option>
                <option value="em_negociacao">Em negociação</option>
                <option value="aguardando_pagamento">Aguardando pagamento</option>
                <option value="encerrado_sem_pagamento">Encerrado sem pagamento</option>
                <option value="quitado">Quitado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Origem
              </label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 cursor-pointer"
              >
                <option value="FAEC / VG Módulos">FAEC / VG Módulos</option>
                <option value="Master N2">Master N2</option>
                <option value="Educa Mais">Educa Mais</option>
                <option value="VG Contratos">VG Contratos</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Responsável
              </label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Helena">Helena</option>
                <option value="Ymalaia">Ymalaia</option>
              </select>
            </div>
          </div>

          {/* Notes / Observações */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Observações Iniciais
            </label>
            <textarea
              rows={3}
              placeholder="Instruções, histórico prévio de cobrança ou detalhes do contrato..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none font-normal"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Criar Negócio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
