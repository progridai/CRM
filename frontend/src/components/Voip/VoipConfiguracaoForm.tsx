import { useEffect, useState, type FormEvent } from 'react';
import {
  erroVoip, obterConfiguracaoVoip, salvarConfiguracaoVoip, URL_VOIP_PADRAO, type VoipConfiguracao,
} from '../../services/voipService';

const campo = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950';
const acao = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700';

export function VoipConfiguracaoForm() {
  const [config, setConfig] = useState<VoipConfiguracao | null>(null);
  const [token, setToken] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    obterConfiguracaoVoip(controller.signal)
      .then(setConfig)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(erroVoip(error, 'Falha ao carregar a configuração.'));
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
      setConfig(await salvarConfiguracaoVoip({
        urlApi: config.urlApi.trim() || URL_VOIP_PADRAO,
        ativo: config.ativo,
        token: token || undefined,
      }));
      setToken('');
      setMensagem('Configuração salva.');
    } catch (error) {
      setErro(erroVoip(error, 'Falha ao salvar a configuração.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Discador VoIP</h2>
        {config && (
          <p className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            config.tokenConfigurado
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          }`}>
            {config.tokenConfigurado ? 'Token salvo' : 'Token pendente'}
          </p>
        )}
      </div>
      {erro && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{erro}</p>}
      {mensagem && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">{mensagem}</p>}
      {!config && !erro && <p role="status" className="text-sm text-slate-500">Carregando configuração…</p>}
      {config && (
        <form onSubmit={salvar} className="space-y-4">
          <fieldset disabled={ocupado} className="grid gap-4 text-sm">
            <label className="space-y-1">
              <span>URL da API</span>
              <input required type="url" maxLength={500} className={campo} value={config.urlApi}
                onChange={(e) => setConfig({ ...config, urlApi: e.target.value })} />
            </label>
            <label className="space-y-1">
              <span>Token da API (X-Api-Token)</span>
              <input required={!config.tokenConfigurado} maxLength={2048} type="password" autoComplete="new-password" className={campo}
                placeholder={config.tokenConfigurado ? 'Preencha para substituir o token salvo' : undefined}
                value={token} onChange={(e) => setToken(e.target.value)} />
              <span className="block text-xs text-slate-500">O token fica criptografado no banco e não é exibido novamente.</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-indigo-600" checked={config.ativo}
                onChange={(e) => setConfig({ ...config, ativo: e.target.checked })} />
              Configuração ativa para novas ligações
            </label>
          </fieldset>
          <button type="submit" disabled={ocupado} className={`${acao} bg-indigo-600 text-white hover:bg-indigo-700`}>Salvar</button>
          {config.atualizadoEm && (
            <p className="text-xs text-slate-400">
              Última alteração: {new Date(config.atualizadoEm).toLocaleString('pt-BR')}
              {config.atualizadoPor ? ` por ${config.atualizadoPor}` : ''}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
