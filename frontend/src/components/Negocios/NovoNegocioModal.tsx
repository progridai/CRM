import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Briefcase, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { listarContatos, type ContatoDto } from '../../services/contatosService';
import { listarUsuarios, obterPerfilLogado, type UsuarioDto } from '../../services/usuariosService';
import { criarNegocio, type EtapaDto } from '../../services/negociosService';

// ─── Utilitários ─────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function gerarAnos(): number[] {
  const anoAtual = new Date().getFullYear();
  const anos: number[] = [];
  for (let a = anoAtual - 5; a <= anoAtual + 5; a++) anos.push(a);
  return anos;
}

function formatarDocumento(doc: string): string {
  if (!doc) return '';
  const limpo = doc.replace(/\D/g, '');
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (limpo.length === 14) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

function formatarMoedaInput(valor: string): string {
  // Remove tudo que não é dígito
  const soDigitos = valor.replace(/\D/g, '');
  if (!soDigitos) return '';
  const numero = parseInt(soDigitos, 10) / 100;
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseMoeda(valor: string): number {
  const limpo = valor.replace(/\./g, '').replace(',', '.');
  return parseFloat(limpo) || 0;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface NovoNegocioModalProps {
  isOpen: boolean;
  etapas: EtapaDto[];
  onClose: () => void;
  onNegocioCriado: () => void;   // callback para refresh do Kanban
}

// ─── Componente ──────────────────────────────────────────────────────────────

export const NovoNegocioModal: React.FC<NovoNegocioModalProps> = ({
  isOpen,
  etapas,
  onClose,
  onNegocioCriado,
}) => {
  // ── Estados do formulário ──────────────────────────────────────────────────
  const hoje = new Date();
  const [contatos, setContatos]                     = useState<ContatoDto[]>([]);
  const [clientePublicId, setClientePublicId]       = useState('');

  const [valorStr, setValorStr]             = useState('');
  const [referencia, setReferencia]         = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [origem, setOrigem]                 = useState('');
  const [etapaPublicId, setEtapaPublicId]   = useState('');
  const [operadorId, setOperadorId]         = useState<number | ''>('');
  const [notas, setNotas]                   = useState('');

  const [usuarios, setUsuarios]           = useState<UsuarioDto[]>([]);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioDto | null>(null);
  const [salvando, setSalvando]           = useState(false);
  const [erroGlobal, setErroGlobal] = useState<string | null>(null);
  const [sucesso, setSucesso]       = useState(false);

  // Erros individuais
  const [errCliente, setErrCliente] = useState<string | null>(null);
  const [errValor, setErrValor]     = useState<string | null>(null);
  const [errEtapa, setErrEtapa]     = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputClienteRef = useRef<HTMLInputElement>(null);

  // ── Efeito: definir etapa default ao abrir ─────────────────────────────────
  useEffect(() => {
    if (isOpen && etapas.length > 0 && !etapaPublicId) {
      setEtapaPublicId(etapas[0].publicId);
    }
  }, [isOpen, etapas]);

  // ── Efeito: carregar dados iniciais ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    
    // Carregar usuários e perfil
    listarUsuarios().then(r => setUsuarios(r.itens)).catch(() => {});
    if (!usuarioLogado) {
      obterPerfilLogado().then(u => {
        setUsuarioLogado(u);
        setOperadorId(u.usuarioId);
      }).catch(() => {});
    } else {
      setOperadorId(usuarioLogado.usuarioId);
    }

    // Carregar contatos para o combo
    listarContatos('', 1, 100).then(r => {
        setContatos(r.itens);
        if (r.itens.length > 0 && !clientePublicId) {
            setClientePublicId(r.itens[0].clientePublicId);
        }
    }).catch(() => {});

  }, [isOpen, usuarioLogado]);



  // ── Máscara do valor monetário ─────────────────────────────────────────────
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarMoedaInput(e.target.value);
    setValorStr(formatado);
    setErrValor(null);
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setClientePublicId(contatos[0]?.clientePublicId ?? '');
    setValorStr('');
    setReferencia('');
    setDataVencimento('');
    setOrigem('');
    setEtapaPublicId(etapas[0]?.publicId ?? '');
    setOperadorId(usuarioLogado?.usuarioId ?? '');
    setNotas('');
    setErroGlobal(null);
    setSucesso(false);
    setErrCliente(null);
    setErrValor(null);
    setErrEtapa(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações frontend
    let valido = true;

    if (!clientePublicId) {
      setErrCliente('Selecione um contato na lista.');
      valido = false;
    }

    const valor = parseMoeda(valorStr);
    if (!valorStr || valor <= 0) {
      setErrValor('Informe um valor maior que zero.');
      valido = false;
    }

    if (!etapaPublicId) {
      setErrEtapa('Selecione a etapa inicial.');
      valido = false;
    }

    if (!valido) return;

    setSalvando(true);
    setErroGlobal(null);

    try {
      await criarNegocio({
        clientePublicId,
        valor,
        referencia:    referencia.trim() || undefined,
        dataVencimento: dataVencimento || new Date().toISOString().split('T')[0],
        origem:        origem.trim() || undefined,
        etapaPublicId,
        operadorId:    operadorId !== '' ? operadorId : undefined,
        notas:         notas.trim() || undefined,
      });

      setSucesso(true);
      setTimeout(() => {
        onNegocioCriado();
        handleClose();
      }, 800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0] ||
        'Erro ao criar negócio. Tente novamente.';
      setErroGlobal(msg);
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  const fieldCls = `w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 font-medium`;
  const readonlyCls = `w-full h-9 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-500 cursor-not-allowed select-none font-mono`;
  const labelCls = `text-xs font-semibold text-slate-700`;
  const errorCls = `text-[11px] text-rose-500 mt-0.5`;

  const anos = gerarAnos();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-0 max-h-[96vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalEntrada 0.15s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 flex-shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Criar Novo Negócio
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Insira as informações essenciais para abrir a cobrança no pipeline.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form ──────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">

          {/* 1. Contato — Combo Box (largura total) */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>
              Contato <span className="text-rose-500">*</span>
            </label>
            <select
                value={clientePublicId}
                onChange={e => { setClientePublicId(e.target.value); setErrCliente(null); }}
                className={`w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 font-medium cursor-pointer ${errCliente ? 'border-rose-400' : ''}`}
              >
                {contatos.length === 0 && <option value="">Carregando contatos...</option>}
                {contatos.map(c => (
                  <option key={c.clientePublicId} value={c.clientePublicId}>{c.nome}</option>
                ))}
            </select>
            {errCliente && <p className={errorCls}>{errCliente}</p>}
          </div>

          {/* 4+5. Valor + Referência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Valor do Débito (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 1.450,00"
                value={valorStr}
                onChange={handleValorChange}
                className={`${fieldCls} font-mono ${errValor ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`}
              />
              {errValor && <p className={errorCls}>{errValor}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Referência Externa</label>
              <input
                type="text"
                placeholder="Ex: 14299"
                value={referencia}
                maxLength={50}
                onChange={e => setReferencia(e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          {/* 6+7. Competência + Etapa Inicial */}
          <div className="grid grid-cols-2 gap-3">
            {/* Data de Vencimento */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Data de Vencimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className={`${fieldCls} cursor-pointer`}
              />
            </div>

            {/* Etapa Inicial */}
            <div className="flex flex-col gap-1">
              <label className={labelCls}>
                Etapa Inicial <span className="text-rose-500">*</span>
              </label>
              <select
                value={etapaPublicId}
                onChange={e => { setEtapaPublicId(e.target.value); setErrEtapa(null); }}
                className={`w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 font-medium cursor-pointer ${errEtapa ? 'border-rose-400' : ''}`}
              >
                {etapas.map(e => (
                  <option key={e.publicId} value={e.publicId}>{e.nome}</option>
                ))}
              </select>
              {errEtapa && <p className={errorCls}>{errEtapa}</p>}
            </div>
          </div>

          {/* 8+9. Origem + Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Origem</label>
              <input
                type="text"
                placeholder="Ex: FAEC, Indicação..."
                value={origem}
                maxLength={150}
                onChange={e => setOrigem(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Responsável</label>
              <select
                value={operadorId}
                onChange={e => setOperadorId(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 font-medium cursor-pointer"
              >
                {usuarios.map(u => (
                  <option key={u.usuarioId} value={u.usuarioId}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 10. Observações */}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Observações Iniciais</label>
            <textarea
              rows={3}
              placeholder="Instruções, histórico prévio de cobrança ou detalhes do contrato..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Erro global */}
          {erroGlobal && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs">{erroGlobal}</p>
            </div>
          )}

          {/* Sucesso */}
          {sucesso && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs font-medium">Negócio criado com sucesso! Atualizando o Kanban…</p>
            </div>
          )}

          {/* ── Ações ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={salvando}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando || sucesso}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs shadow-indigo-200 transition-all"
            >
              {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {salvando ? 'Criando…' : 'Criar Negócio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
