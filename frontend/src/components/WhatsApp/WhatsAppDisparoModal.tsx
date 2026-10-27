import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, MessageCircle, Send, X, XCircle } from 'lucide-react';
import {
  criarDisparoWhatsApp,
  prepararDisparoWhatsApp,
  type WhatsAppDisparoResumoDto,
  type WhatsAppPreviewDto,
} from '../../services/whatsappService';

interface WhatsAppDisparoModalProps {
  isOpen: boolean;
  negocioIds: string[];
  tipo?: 'individual' | 'massa';
  tituloInicial?: string;
  onClose: () => void;
  onCompleted?: (resultado: WhatsAppDisparoResumoDto) => void;
}

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ?? error?.message ?? 'Não foi possível preparar o disparo.';

export const WhatsAppDisparoModal: React.FC<WhatsAppDisparoModalProps> = ({
  isOpen,
  negocioIds,
  tipo,
  tituloInicial = 'Aviso de parcela em aberto',
  onClose,
  onCompleted,
}) => {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [preview, setPreview] = useState<WhatsAppPreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<WhatsAppDisparoResumoDto | null>(null);

  useEffect(() => {
    if (!isOpen || negocioIds.length === 0) return;
    let active = true;
    setTitulo(tituloInicial);
    setPreview(null);
    setResultado(null);
    setError(null);
    setLoading(true);
    prepararDisparoWhatsApp({ titulo: tituloInicial, negocioIds, tipo })
      .then((data) => {
        if (active) setPreview(data);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isOpen, negocioIds, tipo, tituloInicial]);

  if (!isOpen) return null;

  const enviar = async () => {
    if (!titulo.trim() || !preview?.aptos) return;
    setSending(true);
    setError(null);
    try {
      const data = await criarDisparoWhatsApp({ titulo: titulo.trim(), negocioIds, tipo });
      setResultado(data);
      onCompleted?.(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const accepted = resultado?.status === 'aceito_fornecedor';
  const uncertain = resultado?.status === 'resultado_incerto';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-disparo-title" className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="whatsapp-disparo-title" className="font-display text-base font-bold text-slate-900 dark:text-slate-100">Enviar mensagem inicial</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Confira os destinatários antes de confirmar.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" /> Preparando destinatários…
            </div>
          ) : resultado ? (
            <div className={`rounded-2xl border p-5 ${accepted ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : uncertain ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30'}`}>
              <div className="flex items-start gap-3">
                {accepted ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : uncertain ? <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" /> : <XCircle className="h-6 w-6 shrink-0 text-rose-600" />}
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{accepted ? 'Campanha aceita pela Sisnetsul' : uncertain ? 'Envio sem confirmação' : 'Envio rejeitado pela Sisnetsul'}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{resultado.mensagemRetorno || resultado.erro || 'Consulte o histórico para mais detalhes.'}</p>
                  {resultado.campanhaIdExterno && <p className="mt-2 text-[11px] font-semibold text-slate-500">Campanha externa #{resultado.campanhaIdExterno}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Título da campanha</span>
                <input value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={200} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </label>

              {preview && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-[10px] font-bold uppercase text-slate-400">Selecionados</p><p className="mt-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">{preview.selecionados}</p></div>
                    <div className="rounded-xl border border-emerald-200 p-3 dark:border-emerald-900"><p className="text-[10px] font-bold uppercase text-emerald-600">Aptos</p><p className="mt-1 text-xl font-extrabold text-emerald-600">{preview.aptos}</p></div>
                    <div className="rounded-xl border border-amber-200 p-3 dark:border-amber-900"><p className="text-[10px] font-bold uppercase text-amber-600">Excluídos</p><p className="mt-1 text-xl font-extrabold text-amber-600">{preview.excluidos}</p></div>
                  </div>

                  {preview.destinatarios[0] && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prévia da primeira mensagem</p>
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700 dark:text-slate-300">{preview.destinatarios[0].mensagem}</p>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {preview.destinatarios.map((destinatario) => (
                        <div key={`${destinatario.negocioPublicId}-${destinatario.numero}`} className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 last:border-0 dark:border-slate-800">
                          <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{destinatario.nome}</span>
                          <span className="ml-3 shrink-0 text-[11px] text-slate-500">+{destinatario.numero}</span>
                        </div>
                      ))}
                      {preview.itensExcluidos.map((item) => (
                        <div key={`${item.negocioPublicId}-${item.motivo}`} className="flex items-start gap-2 border-b border-slate-100 bg-amber-50/50 px-3 py-2.5 last:border-0 dark:border-slate-800 dark:bg-amber-950/10">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{item.nome}</p><p className="text-[10px] text-amber-700 dark:text-amber-300">{item.motivo}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">{resultado ? 'Fechar' : 'Cancelar'}</button>
          {!resultado && (
            <button type="button" onClick={() => void enviar()} disabled={sending || !preview?.aptos || !titulo.trim()} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Enviando…' : `Confirmar envio${preview?.aptos ? ` (${preview.aptos})` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
