import { api } from './api';

export interface WhatsAppConfiguracaoDto {
  publicId: string;
  nome: string;
  fornecedor: string;
  baseUrl: string;
  endpointDisparo: string;
  canal: string;
  templatePadrao: string;
  templateLanguage: string;
  mensagemTemplate: string;
  seguroPadrao: string;
  abrirAtendimento: boolean;
  filaDisparo?: string;
  agenteDisparo?: string;
  timeoutSegundos: number;
  credencialConfigurada: boolean;
  atualizadoEm: string;
  atualizadoPor?: string;
}

export interface AtualizarWhatsAppConfiguracaoPayload {
  baseUrl: string;
  endpointDisparo: string;
  canal: string;
  templatePadrao: string;
  templateLanguage: string;
  mensagemTemplate: string;
  seguroPadrao: string;
  abrirAtendimento: boolean;
  filaDisparo?: string;
  agenteDisparo?: string;
  timeoutSegundos: number;
}

export interface CriarDisparoWhatsAppPayload {
  titulo: string;
  negocioIds: string[];
  tipo?: 'individual' | 'massa';
}

export interface WhatsAppPreviewDestinatarioDto {
  negocioPublicId: string;
  nome: string;
  numero: string;
  mensagem: string;
}

export interface WhatsAppPreviewExcluidoDto {
  negocioPublicId: string;
  nome: string;
  numero?: string;
  motivo: string;
}

export interface WhatsAppPreviewDto {
  selecionados: number;
  aptos: number;
  excluidos: number;
  destinatarios: WhatsAppPreviewDestinatarioDto[];
  itensExcluidos: WhatsAppPreviewExcluidoDto[];
}

export interface WhatsAppDisparoResumoDto {
  publicId: string;
  tipo: 'individual' | 'massa';
  titulo: string;
  template: string;
  status: 'pendente' | 'aceito_fornecedor' | 'rejeitado' | 'resultado_incerto';
  totalSelecionados: number;
  totalDestinatarios: number;
  totalExcluidos: number;
  endpointFornecedor: string;
  httpStatusFornecedor?: number;
  campanhaIdExterno?: number;
  mensagemRetorno?: string;
  erro?: string;
  criadoEm: string;
  concluidoEm?: string;
  operadorNome: string;
  diagnostico?: {
    requisicao: {
      metodo: string;
      url: string;
      cabecalhos: Record<string, string>;
      curl: string;
      titulo: string;
      canal: string;
      template: string;
      templateLanguage: string;
      totalDestinatarios: number;
      numerosDestinatarios: string[];
      camposPorDestinatario: string[];
      abrirAtendimento: boolean;
      filaDisparo?: string;
      agenteDisparo?: string;
    };
    resposta: {
      httpStatus?: number;
      corpo?: string;
    };
  };
}

export interface WhatsAppDisparoDestinatarioDto {
  negocioPublicId?: string;
  nome: string;
  numero?: string;
  mensagem?: string;
  status: string;
  erro?: string;
}

export interface WhatsAppDisparoDetalheDto {
  disparo: WhatsAppDisparoResumoDto;
  destinatarios: WhatsAppDisparoDestinatarioDto[];
}

export async function obterConfiguracaoWhatsApp(): Promise<WhatsAppConfiguracaoDto> {
  const { data } = await api.get<WhatsAppConfiguracaoDto>('/api/integracoes/whatsapp');
  return data;
}

export async function atualizarConfiguracaoWhatsApp(
  payload: AtualizarWhatsAppConfiguracaoPayload,
): Promise<WhatsAppConfiguracaoDto> {
  const { data } = await api.put<WhatsAppConfiguracaoDto>('/api/integracoes/whatsapp', payload);
  return data;
}

export async function prepararDisparoWhatsApp(
  payload: CriarDisparoWhatsAppPayload,
): Promise<WhatsAppPreviewDto> {
  const { data } = await api.post<WhatsAppPreviewDto>('/api/whatsapp/disparos/preview', payload);
  return data;
}

export async function criarDisparoWhatsApp(
  payload: CriarDisparoWhatsAppPayload,
): Promise<WhatsAppDisparoResumoDto> {
  try {
    const { data, status } = await api.post<WhatsAppDisparoResumoDto>('/api/whatsapp/disparos', payload);
    registrarDiagnostico(data, status);
    return data;
  } catch (error: any) {
    if (error?.response?.data?.publicId) {
      const resultado = error.response.data as WhatsAppDisparoResumoDto;
      registrarDiagnostico(resultado, error.response.status);
      return resultado;
    }
    throw error;
  }
}

function registrarDiagnostico(resultado: WhatsAppDisparoResumoDto, httpCrm: number) {
  const mensagem = resultado.erro || resultado.mensagemRetorno || 'Sem mensagem retornada.';
  console.groupCollapsed(
    `%c[WhatsApp / Sisnetsul] ${resultado.status}`,
    `color: ${resultado.status === 'aceito_fornecedor' ? '#059669' : '#dc2626'}; font-weight: bold`,
  );
  console.table({
    horario: new Date().toISOString(),
    disparoId: resultado.publicId,
    endpointFornecedor: resultado.endpointFornecedor || 'não informado',
    httpNossoBackend: httpCrm,
    httpSisnetsul: resultado.httpStatusFornecedor ?? 'sem resposta HTTP',
    status: resultado.status,
    campanhaSisnetsul: resultado.campanhaIdExterno ?? 'não criada',
    mensagemFornecedor: mensagem,
    destinatarios: resultado.totalDestinatarios,
    excluidos: resultado.totalExcluidos,
  });

  if (resultado.diagnostico) {
    const { requisicao, resposta } = resultado.diagnostico;
    console.group('REQUEST → Sisnetsul');
    console.log({
      metodo: requisicao.metodo,
      url: requisicao.url,
      headers: requisicao.cabecalhos,
      body: {
        titulo: requisicao.titulo,
        canal: requisicao.canal,
        template: requisicao.template,
        templateLanguage: requisicao.templateLanguage,
        destinatarios: {
          total: requisicao.totalDestinatarios,
          numeros: requisicao.numerosDestinatarios,
          camposEnviados: requisicao.camposPorDestinatario,
        },
        abrirAtendimento: requisicao.abrirAtendimento,
        filaDisparo: requisicao.filaDisparo,
        agenteDisparo: requisicao.agenteDisparo,
      },
    });
    console.log('cURL reproduzível (substitua <API_KEY> pela chave):');
    console.log(requisicao.curl);
    console.groupEnd();

    console.group('RESPONSE ← Sisnetsul');
    console.log({
      httpStatus: resposta.httpStatus ?? 'sem resposta HTTP',
      body: parseResponseBody(resposta.corpo),
    });
    console.groupEnd();
  } else {
    console.info('Diagnóstico detalhado indisponível. Reinicie o back-end e tente novamente.');
  }

  console.info('A chave da API permanece mascarada; o cURL contém os dados do envio para diagnóstico.');
  console.groupEnd();
}

function parseResponseBody(body?: string) {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function listarDisparosWhatsApp(limite = 100): Promise<WhatsAppDisparoResumoDto[]> {
  const { data } = await api.get<WhatsAppDisparoResumoDto[]>(`/api/whatsapp/disparos?limite=${limite}`);
  return data;
}

export async function obterDisparoWhatsApp(publicId: string): Promise<WhatsAppDisparoDetalheDto> {
  const { data } = await api.get<WhatsAppDisparoDetalheDto>(`/api/whatsapp/disparos/${publicId}`);
  return data;
}
