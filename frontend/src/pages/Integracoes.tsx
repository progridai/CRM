import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, MessageCircle, PlugZap, Save, Server } from 'lucide-react';
import {
  atualizarConfiguracaoWhatsApp,
  obterConfiguracaoWhatsApp,
  type AtualizarWhatsAppConfiguracaoPayload,
  type WhatsAppConfiguracaoDto,
} from '../services/whatsappService';

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ?? 'Não foi possível carregar as configurações da integração.';

export const IntegracoesPage: React.FC = () => {
  const [config, setConfig] = useState<WhatsAppConfiguracaoDto | null>(null);
  const [form, setForm] = useState<AtualizarWhatsAppConfiguracaoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obterConfiguracaoWhatsApp();
      setConfig(data);
      setForm({
        baseUrl: data.baseUrl,
        endpointDisparo: data.endpointDisparo,
        canal: data.canal,
        templatePadrao: data.templatePadrao,
        templateLanguage: data.templateLanguage,
        mensagemTemplate: data.mensagemTemplate,
        seguroPadrao: data.seguroPadrao,
        abrirAtendimento: data.abrirAtendimento,
        filaDisparo: data.filaDisparo,
        agenteDisparo: data.agenteDisparo,
        timeoutSegundos: data.timeoutSegundos,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const update = <K extends keyof AtualizarWhatsAppConfiguracaoPayload>(key: K, value: AtualizarWhatsAppConfiguracaoPayload[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await atualizarConfiguracaoWhatsApp(form);
      setConfig(data);
      setSuccess('Configuração atualizada. Os próximos disparos já usarão esses dados.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" />Carregando integração…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><PlugZap className="h-5 w-5" /></span>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Integrações</h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Configurações técnicas disponíveis somente para administradores.</p>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
      {success && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</div>}

      {config && form && (
        <form onSubmit={salvar} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><MessageCircle className="h-5 w-5" /></span>
              <div><h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">WhatsApp</h2><p className="text-[11px] text-slate-500">Fornecedor: {config.fornecedor}</p></div>
            </div>
            <div className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold ${config.credencialConfigurada ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>
              <KeyRound className="h-3.5 w-3.5" />
              Credencial {config.credencialConfigurada ? 'configurada' : 'ausente'}
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2"><Server className="h-4 w-4 text-indigo-600" /><h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Conexão</h3></div>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Endereço base HTTPS</span><input required type="url" value={form.baseUrl} onChange={(e) => update('baseUrl', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Endpoint de disparo</span><input required value={form.endpointDisparo} onChange={(e) => update('endpointDisparo', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Canal oficial</span><input required value={form.canal} onChange={(e) => update('canal', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Timeout</span><input required type="number" min={5} max={120} value={form.timeoutSegundos} onChange={(e) => update('timeoutSegundos', Number(e.target.value))} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">A chave permanece somente na variável <code className="font-semibold text-slate-700 dark:text-slate-200">Integracoes__Sisnetsul__ApiKey</code> do servidor.</div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Template e atendimento</h3>
              <div className="grid grid-cols-[1fr_110px] gap-3">
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Template aprovado</span><input required value={form.templatePadrao} onChange={(e) => update('templatePadrao', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Idioma</span><input required value={form.templateLanguage} onChange={(e) => update('templateLanguage', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
              </div>
              <div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-[10px] leading-4 text-slate-500 dark:bg-slate-950/50 dark:text-slate-400 sm:grid-cols-3">
                <span><code className="font-bold text-slate-700 dark:text-slate-200">{'{{1}}'}</code> Nome do cliente</span>
                <span><code className="font-bold text-slate-700 dark:text-slate-200">{'{{2}}'}</code> Parcela (MM/AAAA)</span>
                <span><code className="font-bold text-slate-700 dark:text-slate-200">{'{{3}}'}</code> Seguro</span>
              </div>
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Seguro padrão (variável 3)</span><input required value={form.seguroPadrao} onChange={(e) => update('seguroPadrao', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><span className="mt-1 block text-[10px] text-slate-400">Nome enviado à Sisnetsul, por exemplo: Icatu - COPEL.</span></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fila</span><input value={form.filaDisparo ?? ''} onChange={(e) => update('filaDisparo', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
                <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Agente opcional</span><input value={form.agenteDisparo ?? ''} onChange={(e) => update('agenteDisparo', e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><input type="checkbox" checked={form.abrirAtendimento} onChange={(e) => update('abrirAtendimento', e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />Abrir atendimento quando houver resposta</label>
            </section>

            <section className="lg:col-span-2">
              <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Texto registrado no histórico da Sisnetsul</span><textarea required rows={7} value={form.mensagemTemplate} onChange={(e) => update('mensagemTemplate', e.target.value)} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-5 text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><p className="mt-1 text-[10px] text-slate-400">Use {'{{1}}'} para o nome, {'{{2}}'} para a parcela e {'{{3}}'} para o seguro.</p></label>
            </section>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <p className="text-[10px] text-slate-400">Última alteração: {new Date(config.atualizadoEm).toLocaleString('pt-BR')}{config.atualizadoPor ? ` por ${config.atualizadoPor}` : ''}</p>
            <button type="submit" disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Salvando…' : 'Salvar configurações'}</button>
          </div>
        </form>
      )}
    </div>
  );
};
