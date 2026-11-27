import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  adicionarTelefoneAssertiva, consultarAssertiva, erroAssertiva, obterFichaAssertiva, obterHistoricoAssertiva,
  type AssertivaFicha as Ficha, type AssertivaHistorico, type AssertivaTelefone,
} from '../../services/assertivaService';

const botao = 'rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-indigo-400 disabled:opacity-50 dark:border-slate-700';
const painel = 'space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800';
const status = { sucesso: 'Concluída', sem_resultado: 'Sem contatos encontrados', erro: 'Falhou', pendente: 'Em andamento' };
const errosHistorico: Record<string, string> = {
  autenticacao: 'Falha na autenticação', permissao: 'Acesso recusado pela Assertiva', indisponivel: 'Serviço indisponível',
  rejeitada: 'Consulta rejeitada', resposta_invalida: 'Resposta inesperada', chave_protecao: 'Chave de proteção inválida',
  interrompida: 'Consulta interrompida, com resultado desconhecido',
};
const dataHora = (data: string) => new Date(data).toLocaleString('pt-BR');
const tempo = (dias: number) => dias === 0 ? 'há menos de um dia' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
const formatarTelefone = (numero: string) => `(${numero.slice(0, 2)}) ${numero.slice(2, -4)}-${numero.slice(-4)}`;

export function AssertivaFicha({ clienteId, onTelefoneAdicionado }: { clienteId: string; onTelefoneAdicionado?: () => void }) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [revisando, setRevisando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [telefone, setTelefone] = useState<AssertivaTelefone | null>(null);
  const [historico, setHistorico] = useState(false);
  const resultado = ficha?.ultimaConsulta;

  useEffect(() => {
    const controller = new AbortController();
    obterFichaAssertiva(clienteId, controller.signal)
      .then(setFicha)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(erroAssertiva(error, 'Falha ao carregar a ficha da Assertiva.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [clienteId]);

  async function recarregar() {
    try {
      setFicha(await obterFichaAssertiva(clienteId));
    } catch (error) {
      setFicha(null);
      setErro(erroAssertiva(error, 'Falha ao recarregar o resultado salvo.'));
    }
  }

  async function atualizar() {
    if (!ficha || ocupado || (resultado?.recente && !confirmado)) return;

    setOcupado(true);
    setRevisando(false);
    setConfirmado(false);
    setErro('');
    setAviso('');
    try {
      setFicha(await consultarAssertiva(clienteId, ficha.ultimaTentativaId, confirmado));
    } catch (error) {
      setErro(erroAssertiva(error, 'Falha ao consultar a Assertiva.'));
      await recarregar();
    } finally {
      setOcupado(false);
    }
  }

  async function adicionar() {
    if (!resultado || !telefone || ocupado) return;

    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      await adicionarTelefoneAssertiva(clienteId, resultado.id, telefone.numero);
      setTelefone(null);
      onTelefoneAdicionado?.();
      setAviso('Telefone disponível no cadastro oficial.');
      await recarregar();
    } catch (error) {
      setErro(erroAssertiva(error, 'Falha ao adicionar o telefone.'));
    } finally {
      setOcupado(false);
    }
  }

  if (carregando) return <p role="status" className="text-sm text-slate-500">Carregando dados salvos…</p>;

  return (
    <div className="space-y-4 text-sm">
      {erro && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{erro}</p>}
      {aviso && <p role="status" className="text-emerald-700 dark:text-emerald-300">{aviso}</p>}
      {!ficha && <button type="button" className={botao} onClick={() => void recarregar()}>Recarregar dados salvos</button>}
      {ficha && (
        <>
          <section className={painel}>
            <h3 className="font-semibold">Última consulta · Assertiva Localize</h3>
            {resultado ? (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {dataHora(resultado.data)} · {tempo(resultado.diasDecorridos)} · {resultado.usuario}
                </p>
                {resultado.resultadoExpirado && <p>O prazo de retenção deste resultado terminou.</p>}
                {!resultado.resultadoExpirado && resultado.telefones.length + resultado.emails.length === 0 && (
                  <p>A consulta foi concluída sem telefones ou e-mails disponíveis.</p>
                )}
              </>
            ) : <p className="text-slate-500 dark:text-slate-400">Nenhuma consulta concluída para este cliente.</p>}

            {!ficha.configurada && <p className="text-slate-500">A configuração da Assertiva está inativa.</p>}
            {!ficha.temCpf && <p className="text-slate-500">O cadastro precisa de um CPF válido para realizar a consulta.</p>}
            {ficha.ultimaTentativa?.status === 'pendente' && (
              <p role="status">Consulta em andamento. Você pode recarregar os dados salvos para acompanhar.</p>
            )}
            {ficha.ultimaTentativa?.status === 'erro' && (
              <p className="text-slate-500 dark:text-slate-400">
                Última tentativa em {dataHora(ficha.ultimaTentativa.data)} · {errosHistorico[ficha.ultimaTentativa.erro ?? ''] ?? 'Falhou'}
              </p>
            )}

            {ficha.configurada && ficha.temCpf && ficha.ultimaTentativa?.status !== 'pendente' && (
              resultado?.recente ? (
                revisando ? (
                  <div className="space-y-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <p>Este cliente já foi consultado {tempo(resultado.diasDecorridos)}, dentro do prazo de {ficha.prazoDias} dias. Uma nova consulta poderá gerar custo adicional.</p>
                    <label className="flex items-start gap-2">
                      <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
                      Estou ciente do possível custo e quero atualizar os dados.
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={botao} disabled={!confirmado || ocupado} onClick={() => void atualizar()}>Confirmar atualização</button>
                      <button type="button" className={botao} onClick={() => { setRevisando(false); setConfirmado(false); }}>Cancelar</button>
                    </div>
                  </div>
                ) : <button type="button" className={botao} disabled={ocupado} onClick={() => setRevisando(true)}>Atualizar dados na Assertiva</button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">A consulta poderá gerar custo.</p>
                  <button type="button" className={botao} disabled={ocupado} onClick={() => void atualizar()}>
                    {resultado ? 'Atualizar dados na Assertiva' : 'Consultar na Assertiva'}
                  </button>
                </div>
              )
            )}
            {ocupado && <p role="status" className="text-xs text-slate-500">Processando…</p>}
            {ficha.ultimaTentativa?.status === 'pendente' && (
              <button type="button" className={`${botao} inline-flex items-center gap-2`} disabled={ocupado} onClick={() => void recarregar()}>
                <RefreshCw className="h-3.5 w-3.5" /> Recarregar dados salvos
              </button>
            )}
          </section>

          {!!resultado?.telefones.length && (
            <section className={painel}>
              <h3 className="font-semibold">Telefones</h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {resultado.telefones.map((item) => (
                  <li key={item.numero} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>{formatarTelefone(item.numero)} <span className="text-xs text-slate-500">{item.tipo === 'CELULAR' ? 'Celular' : 'Fixo'}</span></span>
                    {item.noCadastro ? <span className="text-xs text-emerald-700 dark:text-emerald-400">Já cadastrado</span> :
                      <button type="button" className={botao} disabled={ocupado} onClick={() => setTelefone(item)}>Adicionar ao cadastro</button>}
                  </li>
                ))}
              </ul>
              {telefone && (
                <div className="space-y-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <p>Adicionar {formatarTelefone(telefone.numero)} ao cadastro oficial?</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={botao} disabled={ocupado} onClick={() => void adicionar()}>Confirmar inclusão</button>
                    <button type="button" className={botao} disabled={ocupado} onClick={() => setTelefone(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {!!resultado?.emails.length && (
            <section className={painel}>
              <h3 className="font-semibold">E-mails</h3>
              <ul className="space-y-1 break-all">{resultado.emails.map((email) => <li key={email}>{email}</li>)}</ul>
            </section>
          )}

          {ficha.ultimaTentativa && (
            <section className={painel}>
              <button type="button" aria-expanded={historico} onClick={() => setHistorico(!historico)} className="font-semibold text-indigo-700 dark:text-indigo-300">
                {historico ? 'Ocultar' : 'Ver'} histórico de consultas
              </button>
              {historico && <Historico key={`${ficha.ultimaTentativaId}-${ficha.ultimaTentativa.status}`} clienteId={clienteId} />}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Historico({ clienteId }: { clienteId: string }) {
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<AssertivaHistorico[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    obterHistoricoAssertiva(clienteId, pagina, controller.signal)
      .then(setItens)
      .catch((error) => {
        if (!controller.signal.aborted) setErro(erroAssertiva(error, 'Falha ao carregar o histórico.'));
      });
    return () => controller.abort();
  }, [clienteId, pagina]);

  function navegar(novaPagina: number) {
    setItens(null);
    setErro('');
    setPagina(novaPagina);
  }

  return (
    <>
      {erro && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{erro}</p>}
      {!itens && !erro && <p role="status" className="text-xs text-slate-500">Carregando histórico…</p>}
      {itens?.length === 0 && <p className="text-xs text-slate-500">Nenhuma consulta nesta página.</p>}
      <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
        {itens?.map((item) => (
          <li key={item.id} className="space-y-1 py-2">
            <p className="font-semibold">{status[item.status]} · CPF</p>
            <p>{dataHora(item.data)} · {item.usuario}</p>
            {item.antecipacaoConfirmada && <p>Atualização antecipada confirmada</p>}
            {item.protocolo && <p className="break-all">Protocolo {item.protocolo}</p>}
            {item.erro && <p>{errosHistorico[item.erro] ?? 'Falha na consulta'}</p>}
          </li>
        ))}
      </ul>
      {(pagina > 1 || itens?.length === 20) && (
        <div className="flex items-center gap-2">
          <button type="button" className={botao} disabled={pagina === 1} onClick={() => navegar(pagina - 1)}>Anterior</button>
          <span className="text-xs">Página {pagina}</span>
          <button type="button" className={botao} disabled={itens?.length !== 20} onClick={() => navegar(pagina + 1)}>Próxima</button>
        </div>
      )}
    </>
  );
}
