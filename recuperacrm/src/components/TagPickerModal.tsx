import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import {
  TagDef,
  getAllTags,
  saveCustomTag,
  TAG_COLOR_OPTIONS
} from '../tagUtils';

interface TagPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTag?: string;
  clientName?: string;
  onSelectTag: (tagName: string | undefined) => void;
}

export const TagPickerModal: React.FC<TagPickerModalProps> = ({
  isOpen,
  onClose,
  currentTag,
  clientName,
  onSelectTag
}) => {
  const [tags, setTags] = useState<TagDef[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTags(getAllTags());
      setNewTagName('');
      setIsCreating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (tagName: string) => {
    onSelectTag(tagName);
    onClose();
  };

  const handleRemove = () => {
    onSelectTag(undefined);
    onClose();
  };

  const handleCreateNewTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagName.trim();
    if (!trimmed) return;

    const chosenColor = TAG_COLOR_OPTIONS[selectedColorIdx];
    const newTag: TagDef = {
      name: trimmed,
      badgeClass: chosenColor.badgeClass
    };

    saveCustomTag(newTag);
    setTags(getAllTags());
    onSelectTag(trimmed);
    setNewTagName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TagIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight">
                Gerenciar Etiqueta
              </h3>
              {clientName && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate max-w-[260px]">
                  {clientName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Active Tag Status */}
          {currentTag ? (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ativa:</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 truncate">
                  {currentTag}
                </span>
              </div>
              <button
                onClick={handleRemove}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Remover etiqueta deste negócio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center">
              Nenhuma etiqueta selecionada para este negócio
            </div>
          )}

          {/* Tags list */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              Escolher etiqueta existente
            </span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected =
                  currentTag?.toLowerCase().trim() === tag.name.toLowerCase().trim();
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() => handleSelect(tag.name)}
                    className={`group px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                      tag.badgeClass
                    } ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 font-bold shadow-xs'
                        : 'hover:brightness-95 opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span>{tag.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create New Tag Section */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            {!isCreating ? (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar uma nova etiqueta personalizada</span>
              </button>
            ) : (
              <form
                onSubmit={handleCreateNewTag}
                className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Nova Etiqueta</span>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nome da etiqueta (ex: Em cartório, Negociação presencial)"
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    autoFocus
                  />
                </div>

                {/* Color choices */}
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1.5 font-medium">
                    Cor da etiqueta:
                  </span>
                  <div className="flex items-center gap-2">
                    {TAG_COLOR_OPTIONS.map((c, idx) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setSelectedColorIdx(idx)}
                        title={c.label}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          c.dotClass
                        } ${
                          selectedColorIdx === idx
                            ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-slate-200 scale-110'
                            : 'hover:scale-105 opacity-85'
                        }`}
                      >
                        {selectedColorIdx === idx && (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={!newTagName.trim()}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar e Aplicar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          {currentTag ? (
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover etiqueta</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Clique na etiqueta desejada</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
