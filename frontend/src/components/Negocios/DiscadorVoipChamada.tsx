import { useEffect, useState } from 'react';
import { Loader2, Phone } from 'lucide-react';
import { buscarContatos } from '../../services/contatosService';
import { erroVoip, ligarVoip } from '../../services/voipService';
import type { NegocioDto } from '../../services/negociosService';

const chaveRamal = (usuarioId?: string) =>
  usuarioId ? `progridmais:voip:ramal:${usuarioId}` : 'progridmais:voip:ramal';

const lerRamal = (usuarioId?: string) => {
  try {
    return localStorage.getItem(chaveRamal(usuarioId)) ?? '';
  } catch {
    return '';
  }
};

const gravarRamal = (usuarioId: string | undefined, ramal: string) => {
  try {
    localStorage.setItem(chaveRamal(usuarioId), ramal);
  } catch {
    // O ramal continua utilizável nesta ligação mesmo sem armazenamento local.
  }
};

export function DiscadorVoipChamada({
  negocio,
  usuarioId,
}: {
  negocio: NegocioDto;
  usuarioId?: string;
}) {
  const principal = negocio.telefonePrincipal?.trim() ?? '';
  const [ramal, setRamal] = useState(() => lerRamal(usuarioId));
  const [destino, setDestino] = useState(principal);
  const [opcoes, setOpcoes] = useState<string[]>(() => principal ? [principal] : []);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    const termo = negocio.documento?.replace(/\D/g, '') || negocio.nomeCliente.trim();
    if (!termo) return;
    const controller = new AbortController();
    buscarContatos(termo, 8, controller.signal)
      .then((itens) => {
        const contato = itens.find((item) => item.clientePublicId === negocio.clientePublicId);
        const numeros = [
          principal,
          ...(contato?.telefones ?? []).map((telefone) => telefone.valor.trim()),
        ].filter(Boolean);
        setOpcoes([...new Set(numeros)]);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [negocio.clientePublicId, negocio.documento, negocio.nomeCliente, principal]);

  async function ligar() {
    const ramalInformado = ramal.trim();
    if (!ramalInformado.replace(/\D/g, '') || !destino.replace(/\D/g, '')) {
      setErro('Informe o ramal e o telefone de destino.');
      setMensagem('');
      return;
    }

    gravarRamal(usuarioId, ramalInformado);
    setOcupado(true);
    setErro('');
    setMensagem('');
    try {
      const resposta = await ligarVoip(ramalInformado, destino);
      setMensagem(resposta.mensagem);
    } catch (error) {
      setErro(erroVoip(error, 'Não foi possível iniciar a ligação.'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section id="discador-voip" aria-labelledby="discador-voip-titulo" className="space-y-3 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
      <div>
        <h3 id="discador-voip-titulo" className="font-semibold text-slate-900 dark:text-slate-100">Discador VoIP</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A ligação sai pelo seu ramal na Sisnetsul.</p>
      </div>

      <div className="grid gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">Seu ramal</span>
          <input
            id="discador-voip-ramal"
            value={ramal}
            onChange={(event) => setRamal(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            maxLength={12}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <span className="mt-1 block text-[10px] text-slate-400">Salvo neste navegador</span>
        </label>

        {opcoes.length > 1 && (
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">Telefones da ficha</span>
            <select
              value={opcoes.includes(destino) ? destino : ''}
              onChange={(event) => { if (event.target.value) setDestino(event.target.value); }}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {!opcoes.includes(destino) && <option value="">Número informado</option>}
              {opcoes.map((telefone) => <option key={telefone} value={telefone}>{telefone}</option>)}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-slate-500">Telefone de destino</span>
          <input
            value={destino}
            onChange={(event) => setDestino(event.target.value)}
            inputMode="tel"
            autoComplete="off"
            maxLength={20}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>
      </div>

      {erro && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-300">{erro}</p>}
      {mensagem && <p role="status" className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{mensagem}</p>}

      <button
        type="button"
        onClick={() => void ligar()}
        disabled={ocupado}
        className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#5A52FF] text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
        {ocupado ? 'Ligando…' : 'Ligar agora'}
      </button>
    </section>
  );
}
