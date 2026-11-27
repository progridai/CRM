import { useEffect, useState, type FormEvent } from 'react';
import {
  erroAssertiva, obterConfiguracaoAssertiva, salvarConfiguracaoAssertiva, testarAutenticacaoAssertiva,
  type AssertivaConfiguracao,
} from '../../services/assertivaService';

const campo = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const acao = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700';

export function AssertivaConfiguracaoForm() {
  const [config, setConfig] = useState<AssertivaConfiguracao | null>(null);
  const [secret, setSecret] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    obterConfiguracaoAssertiva(controller.signal)
      .then(setConfig)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(erroAssertiva(error, 'Falha ao carregar a configuração.'));
      });
    return () => controller.abort();
  }, []);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!config || ocupado) return;

    setOcupado(true);
    setErro('');
    setMensagem('');
    try {
      const { clientId, ativa, finalidade, prazoDias, retencaoDias, revisao } = config;
      setConfig(await salvarConfiguracaoAssertiva({
        clientId, ativa, finalidade, prazoDias, retencaoDias, revisao, clientSecret: secret || undefined,
      }));
      setSecret('');
      setMensagem('Configuração salva.');
    } catch (error) {
      setErro(erroAssertiva(error, 'Falha ao salvar a configuração.'));
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setOcupado(true);
    setErro('');
    setMensagem('');
    try {
      await testarAutenticacaoAssertiva();
      setMensagem('Autenticação verificada com as credenciais salvas.');
    } catch (error) {
      setErro(erroAssertiva(error, 'Falha ao verificar a autenticação.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Assertiva Localize</h2>
        {config && <p className="text-sm text-slate-500">{config.secretConfigurado ? 'Credenciais salvas' : 'Credenciais pendentes'}</p>}
      </div>
      {erro && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{erro}</p>}
      {mensagem && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{mensagem}</p>}
      {!config && !erro && <p role="status" className="text-sm text-slate-500">Carregando configuração…</p>}
      {config && (
        <form onSubmit={salvar} className="space-y-4">
          <fieldset disabled={ocupado} className="grid gap-4 text-sm sm:grid-cols-2">
            <label className="space-y-1">
              <span>Client ID</span>
              <input required maxLength={255} className={campo} value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span>Client Secret</span>
              <input required={!config.secretConfigurado} maxLength={2048} type="password" autoComplete="new-password" className={campo}
                placeholder={config.secretConfigurado ? 'Preencha para substituir o segredo salvo' : undefined}
                value={secret} onChange={(e) => setSecret(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span>Finalidade aprovada pela empresa</span>
              <select required className={campo} value={config.finalidade ?? ''}
                onChange={(e) => setConfig({ ...config, finalidade: Number(e.target.value) || null })}>
                <option value="">Selecione a finalidade</option>
                <option value={1}>Confirmação de identidade</option>
                <option value={2}>Ciclo de crédito</option>
                <option value={5}>Legítimo interesse</option>
              </select>
            </label>
            <label className="space-y-1">
              <span>Prazo de referência em dias</span>
              <input required type="number" min={1} max={3650} className={campo} value={config.prazoDias || ''}
                onChange={(e) => setConfig({ ...config, prazoDias: Number(e.target.value) })} />
            </label>
            <label className="space-y-1">
              <span>Retenção dos resultados em dias</span>
              <input required type="number" min={1} max={3650} className={campo} value={config.retencaoDias || ''}
                onChange={(e) => setConfig({ ...config, retencaoDias: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 self-end pb-2">
              <input type="checkbox" className="accent-indigo-600" checked={config.ativa}
                onChange={(e) => setConfig({ ...config, ativa: e.target.checked })} />
              Configuração ativa para novas consultas
            </label>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={ocupado} className={`${acao} bg-indigo-600 text-white hover:bg-indigo-700`}>Salvar configuração</button>
            <button type="button" disabled={ocupado || !config.secretConfigurado} onClick={() => void testar()} className={acao}>
              Testar autenticação salva
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
