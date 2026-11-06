from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUTPUT = r"C:\BRAVIDA\CRM\docs\Diagnostico_Prontidao_CRM_Recuperacao_Inadimplencia.docx"

NAVY = "1F4E78"
NAVY_DARK = "17365D"
PALE_BLUE = "EAF2F8"
PALE_GRAY = "F5F7F9"
MID_GRAY = "667085"
LIGHT_BORDER = "D9D9D9"
BLACK = "000000"
WHITE = "FFFFFF"
AMBER = "FFF4CE"
GREEN = "E2F0D9"
RED = "FCE8E6"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=LIGHT_BORDER, size="4"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = borders.find(qn(f"w:{edge}"))
        if tag is None:
            tag = OxmlElement(f"w:{edge}")
            borders.append(tag)
        tag.set(qn("w:val"), "single")
        tag.set(qn("w:sz"), size)
        tag.set(qn("w:space"), "0")
        tag.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def prevent_row_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    cant_split = OxmlElement("w:cantSplit")
    tr_pr.append(cant_split)


def set_run_font(run, name="Aptos", size=None, bold=None, color=None, italic=None):
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)
    if italic is not None:
        run.italic = italic


def set_column_width(cell, inches):
    cell.width = Inches(inches)
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_w = tc_pr.find(qn("w:tcW"))
    if tc_w is None:
        tc_w = OxmlElement("w:tcW")
        tc_pr.append(tc_w)
    tc_w.set(qn("w:w"), str(int(inches * 1440)))
    tc_w.set(qn("w:type"), "dxa")


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.7)
section.bottom_margin = Inches(0.7)
section.left_margin = Inches(0.72)
section.right_margin = Inches(0.72)

styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"]._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
styles["Normal"]._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
styles["Normal"].font.size = Pt(10.5)
styles["Normal"].font.color.rgb = RGBColor.from_string("202124")
styles["Normal"].paragraph_format.space_after = Pt(5)
styles["Normal"].paragraph_format.line_spacing = 1.08

for style_name, size, before, after in (
    ("Title", 23, 0, 10),
    ("Heading 1", 16, 16, 7),
    ("Heading 2", 12.5, 12, 5),
    ("Heading 3", 11, 9, 4),
):
    style = styles[style_name]
    style.font.name = "Aptos Display" if style_name != "Heading 3" else "Aptos"
    style._element.rPr.rFonts.set(qn("w:ascii"), style.font.name)
    style._element.rPr.rFonts.set(qn("w:hAnsi"), style.font.name)
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor.from_string(BLACK)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

styles["Title"].paragraph_format.space_before = Pt(0)
styles["Title"].paragraph_format.keep_with_next = True

if "Source Note" not in styles:
    source_style = styles.add_style("Source Note", WD_STYLE_TYPE.PARAGRAPH)
else:
    source_style = styles["Source Note"]
source_style.font.name = "Aptos"
source_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
source_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
source_style.font.size = Pt(8.5)
source_style.font.color.rgb = RGBColor.from_string(MID_GRAY)
source_style.paragraph_format.space_after = Pt(4)

if "Compact" not in styles:
    compact_style = styles.add_style("Compact", WD_STYLE_TYPE.PARAGRAPH)
else:
    compact_style = styles["Compact"]
compact_style.font.name = "Aptos"
compact_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
compact_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
compact_style.font.size = Pt(9.25)
compact_style.paragraph_format.space_after = Pt(2)
compact_style.paragraph_format.line_spacing = 1.02

for list_style in ("List Bullet", "List Number"):
    styles[list_style].font.name = "Aptos"
    styles[list_style]._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    styles[list_style]._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    styles[list_style].font.size = Pt(10.25)
    styles[list_style].paragraph_format.space_after = Pt(3)


def add_paragraph(text="", style=None, bold_lead=None, keep=False):
    paragraph = doc.add_paragraph(style=style)
    if bold_lead and text.startswith(bold_lead):
        lead = paragraph.add_run(bold_lead)
        set_run_font(lead, bold=True)
        rest = paragraph.add_run(text[len(bold_lead):])
        set_run_font(rest)
    else:
        run = paragraph.add_run(text)
        set_run_font(run)
    if keep:
        paragraph.paragraph_format.keep_with_next = True
    return paragraph


def add_bullets(items, level=0):
    for item in items:
        paragraph = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
        paragraph.paragraph_format.left_indent = Inches(0.25 + level * 0.2)
        paragraph.paragraph_format.first_line_indent = Inches(-0.16)
        run = paragraph.add_run(item)
        set_run_font(run, size=10.25)


def add_numbered(items):
    for item in items:
        paragraph = doc.add_paragraph(style="List Number")
        paragraph.paragraph_format.left_indent = Inches(0.3)
        paragraph.paragraph_format.first_line_indent = Inches(-0.2)
        run = paragraph.add_run(item)
        set_run_font(run, size=10.25)


def add_source(text):
    paragraph = doc.add_paragraph(style="Source Note")
    run = paragraph.add_run(text)
    set_run_font(run, size=8.5, color=MID_GRAY, italic=True)
    return paragraph


def add_table(headers, rows, widths=None, font_size=8.7, status_fills=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.allow_autofit = False
    set_table_borders(table)
    header_row = table.rows[0]
    set_repeat_table_header(header_row)
    prevent_row_split(header_row)
    for index, header in enumerate(headers):
        cell = header_row.cells[index]
        set_cell_shading(cell, NAVY)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        set_cell_margins(cell, top=100, bottom=100)
        if widths:
            set_column_width(cell, widths[index])
        paragraph = cell.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_after = Pt(0)
        run = paragraph.add_run(str(header))
        set_run_font(run, size=9, bold=True, color=WHITE)

    for row_index, row_data in enumerate(rows):
        row = table.add_row()
        prevent_row_split(row)
        for index, value in enumerate(row_data):
            cell = row.cells[index]
            if widths:
                set_column_width(cell, widths[index])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            fill = PALE_BLUE if row_index % 2 else WHITE
            if status_fills and index in status_fills:
                normalized = str(value).strip().casefold()
                fill = status_fills[index].get(normalized, fill)
            set_cell_shading(cell, fill)
            paragraph = cell.paragraphs[0]
            paragraph.paragraph_format.space_after = Pt(0)
            paragraph.paragraph_format.line_spacing = 1.0
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if index == 0 and len(headers) <= 3 else WD_ALIGN_PARAGRAPH.LEFT
            run = paragraph.add_run("" if value is None else str(value))
            set_run_font(run, size=font_size, color=BLACK)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr_text = OxmlElement("w:instrText")
    instr_text.set(qn("xml:space"), "preserve")
    instr_text.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr_text)
    run._r.append(fld_char2)
    set_run_font(run, size=8.5, color=MID_GRAY)


add_page_number(section.footer.paragraphs[0])

# Cover
doc.add_paragraph().paragraph_format.space_after = Pt(36)
title = doc.add_paragraph(style="Title")
title.alignment = WD_ALIGN_PARAGRAPH.LEFT
run = title.add_run("Diagnóstico de prontidão do CRM de recuperação de inadimplência")
set_run_font(run, name="Aptos Display", size=23, bold=True, color=BLACK)

subtitle = doc.add_paragraph()
subtitle.paragraph_format.space_after = Pt(22)
run = subtitle.add_run("Escopo mínimo para piloto controlado e pauta de validação com a direção")
set_run_font(run, size=13, color=NAVY_DARK)

meta = add_table(
    ["Documento", "Finalidade"],
    [
        ["Versão de análise 1.0", "Apoiar decisões de escopo, prioridade e governança"],
        ["29 de outubro de 2026", "Consolidar sistema atual, reunião, manual e planilha operacional"],
        ["Uso interno", "Não aprova automaticamente práticas relatadas por colaboradores"],
    ],
    widths=[1.65, 5.25],
    font_size=9.2,
)

add_paragraph(
    "Conclusão principal. O CRM já possui uma base útil para um piloto, mas ainda não controla o ciclo completo da recuperação. Antes do uso operacional amplo, a direção precisa aprovar a fonte oficial dos dados, a unidade de cobrança, os prazos por carteira, os status, as regras de confirmação e baixa, os indicadores e as permissões. A recomendação é não reproduzir a planilha como especificação: ela deve servir como evidência do trabalho atual e como fonte de requisitos a validar.",
    bold_lead="Conclusão principal. ",
)

add_source("Fontes analisadas: código do CRM, transcrição da reunião de 26/10/2026, manual operacional e planilha unificada de setembro de 2026.")

doc.add_page_break()

# 1
doc.add_heading("1 Decisão recomendada", level=1)
add_paragraph(
    "A direção deve autorizar um piloto controlado somente depois de concluir os requisitos P0 deste documento. O piloto pode usar o envio de WhatsApp já existente, o Kanban, atividades e histórico, desde que o sistema também receba os campos operacionais mínimos, aplique prazos por carteira, registre o desfecho financeiro e restrinja ações críticas por perfil."
)
add_paragraph(
    "O CRM ainda não deve substituir a planilha em toda a operação. A substituição ampla agora criaria risco de perda de competência real, prazo, situação de pagamento, evidência e informação de repasse. Esses dados existem na rotina atual, mas não estão representados de forma suficiente no modelo de negócios e na importação vigente."
)

doc.add_heading("Condições para iniciar o piloto", level=2)
add_bullets([
    "Processo e regras aprovados pelo dono, com registro das decisões e responsáveis.",
    "Importação da base escolhida com competência da dívida, carteira, apólice ou contrato, responsável, valor, prazo e identificador da posição.",
    "Fluxo de status e motivos de encerramento aprovados e auditáveis.",
    "Registro de pagamento, confirmação, comprovante ou referência da evidência e encaminhamento para baixa.",
    "Fila operacional com próximos vencimentos, pendências sem retorno e ações atrasadas.",
    "Filtros de seleção para disparos e proteção contra envio ao público errado.",
    "Indicadores reconciliados com a base inicial e com critérios de cálculo aprovados.",
    "Perfis de acesso para administração, gestão, cobrança, faturamento e consulta.",
])

doc.add_heading("Decisão sobre prontidão", level=2)
add_table(
    ["Cenário", "Avaliação", "Decisão sugerida"],
    [
        ["Demonstração e testes técnicos", "Pronto", "Continuar com dados controlados"],
        ["Piloto operacional limitado", "Condicionado", "Liberar após os requisitos P0"],
        ["Substituição total da planilha", "Não pronto", "Aguardar validação e estabilização do piloto"],
        ["Automação completa multicanal", "Fase posterior", "Planejar após o fluxo básico provar resultado"],
    ],
    widths=[1.9, 1.2, 3.8],
    font_size=9.0,
    status_fills={1: {"pronto": GREEN, "condicionado": AMBER, "não pronto": RED, "fase posterior": PALE_GRAY}},
)

# 2
doc.add_heading("2 Critério usado na análise", level=1)
add_paragraph(
    "As fontes têm pesos diferentes. O código mostra o que o sistema faz hoje. A planilha mostra o trabalho praticado e seus dados, inclusive problemas. O manual mostra um processo documentado, mas contém pontos incompletos e precisa de aprovação. A reunião mostra necessidades e hipóteses da usuária, não decisões da empresa."
)
add_table(
    ["Fonte", "O que comprova", "Como usar"],
    [
        ["Código do CRM", "Funcionalidades e restrições implementadas", "Base para o inventário atual"],
        ["Planilha unificada", "Campos, volume, indicadores e práticas existentes", "Evidência operacional, não especificação automática"],
        ["Manual operacional", "Fluxos e diferenças entre carteiras", "Proposta de regra sujeita a aprovação"],
        ["Reunião com a Daniele", "Dificuldades, prioridades e uso real", "Hipóteses a validar com dono e demais áreas"],
    ],
    widths=[1.55, 2.5, 2.85],
    font_size=9.0,
)
add_paragraph(
    "Regra de decisão. Nenhum campo, status, meta, prazo ou automação relatado por uma única fonte deve virar regra definitiva sem validação da direção. Quando duas ou mais fontes convergem, o item ganha prioridade de análise, mas ainda depende de definição de responsável e critério de aceite.",
    bold_lead="Regra de decisão. ",
)

# 3
doc.add_page_break()
doc.add_heading("3 Inventário do CRM atual", level=1)
add_paragraph("A revisão estática do repositório confirma os recursos abaixo.")
add_table(
    ["Área", "Situação atual", "Limitação relevante"],
    [
        ["Acesso e usuários", "Autenticação por Keycloak e acesso integrado ao ambiente do WebApólice", "Não há matriz operacional específica por função de cobrança"],
        ["Negócios", "Kanban e lista, criação manual, seis etapas e movimentação por arrastar", "Não há edição completa da posição, próxima ação ou regras por carteira"],
        ["Filtros", "Busca, competência, origem, operador e ordenação", "Não cobre prazo, situação, carteira, contato, resposta, pagamento ou qualidade do telefone"],
        ["Atividades", "WhatsApp, ligação, pagamento e anotação, com atalhos", "Registro manual não possui agendamento, resultado estruturado ou anexo"],
        ["Histórico", "Criação, importação e mudança de etapa com usuário e data", "Ainda não cobre todas as alterações críticas do negócio"],
        ["Contatos", "Consulta, busca, edição de telefones e acesso ao cadastro externo", "Telefones legados podem conter vários números e observações no mesmo campo"],
        ["Importação", "XLSX, modos adicionar e substituir, histórico, log e exclusão por competência", "Lê formato antigo e aplica uma competência única informada na tela"],
        ["WhatsApp", "Preview, deduplicação por número, disparo individual ou em massa e histórico", "Status aceito confirma campanha, não entrega nem resposta"],
        ["Indicadores", "Saldo, recuperado no mês, aguardando pagamento, sem contato e progresso", "Cálculo é local à tela e não substitui relatório auditável"],
        ["Integrações", "Configuração do WhatsApp restrita a administrador", "SMS, e-mail, ligações, SharePoint e origem automática não estão integrados"],
    ],
    widths=[1.25, 3.0, 2.75],
    font_size=8.6,
)

doc.add_heading("Pontos técnicos que afetam a operação", level=2)
add_bullets([
    "A importação atual exige Estipulante, Matrícula, Nome, CPF, Situação, Prêmio e Cobrador. Ela não importa a estrutura completa da planilha unificada recebida.",
    "A competência escolhida no formulário é gravada em todos os negócios importados. Isso conflita com casos que possuem competência real diferente ou múltiplas competências.",
    "O envio de WhatsApp aceito registra atividade e move automaticamente o negócio para Contato em Andamento. Esse comportamento precisa ser aprovado como regra operacional.",
    "A mudança de etapa pode ser feita no Kanban, mas o seletor no detalhe está desabilitado. Não existe edição estruturada de responsável, prazo, valor recuperado, forma de pagamento ou motivo de encerramento.",
    "As rotas de importação, exclusão de competência e disparo estão disponíveis a qualquer usuário autenticado do CRM. Apenas a configuração da integração exige perfil de administrador.",
])

# 4
doc.add_heading("4 O que os materiais operacionais acrescentam", level=1)
add_paragraph(
    "A reunião, o manual e a planilha apontam que a unidade de trabalho não é apenas o cliente. A cobrança depende de carteira ou estipulante, apólice ou contrato, competência da pendência, ciclo de recebimento da base, limite de cobrança, meio de regularização, evidência, confirmação e baixa. Um cliente pode aparecer em mais de uma posição."
)
add_table(
    ["Tema", "Evidência convergente", "Implicação para o CRM"],
    [
        ["Competência", "A competência real pode ser anterior ao mês da importação e pode incluir mais de um período", "Separar ciclo de importação da competência da dívida e definir o grão do negócio"],
        ["Prazo", "Cada carteira possui data de liberação e prazo final próprios", "Agenda, prioridade e encerramento não podem depender de um vencimento genérico"],
        ["Contato", "WhatsApp é o canal inicial; e-mail, ligação e em alguns casos SMS completam as tentativas", "Registrar tentativas, resultado, resposta e próxima ação"],
        ["Pagamento", "Forma, data, valor e modo de confirmação variam por carteira", "Criar registro financeiro estruturado e auditável"],
        ["Comprovante", "Diversas carteiras exigem comprovante e armazenamento no SharePoint", "No mínimo registrar vínculo da evidência; depois integrar o repositório"],
        ["Baixa", "Pode ser realizada pela Inadimplência ou encaminhada ao Faturamento", "Modelar responsável pela baixa, estado de encaminhamento e conclusão"],
        ["Produtividade", "A gestão acompanha recuperação por cobrador, estipulante e dia", "Criar relatórios com base inicial, contatos, pagamentos e recuperação"],
        ["Ciclo mensal", "A base nova não deve herdar automaticamente todos os casos anteriores", "Tratar cada carga como ciclo e preservar histórico sem duplicar ação ativa"],
    ],
    widths=[1.15, 3.0, 2.85],
    font_size=8.55,
)

doc.add_heading("Qualidade observada na planilha", level=2)
add_paragraph(
    "A planilha contém 3.604 registros, 21 estipulantes e dois cobradores. Ela demonstra volume real e campos relevantes, mas também confirma que não pode ser copiada sem saneamento e aprovação."
)
add_table(
    ["Achado", "Evidência", "Risco"],
    [
        ["Telefones não normalizados", "131 linhas sem telefone e 2.676 com múltiplos números ou observações no mesmo campo", "Envio incorreto, duplicidade e baixa taxa de contato"],
        ["Situação incompleta", "64,4% das linhas sem Situação2", "Fila sem desfecho claro e indicadores frágeis"],
        ["Forma de pagamento incompleta", "81,0% das linhas sem forma de pagamento", "Dificuldade de confirmar e auditar recuperação"],
        ["Competências múltiplas", "113 linhas registram mais de uma competência", "Um campo único de mês e ano pode perder informação"],
        ["Resumo diário divergente", "Total diário recuperado de R$ 161.051,28 versus total geral de R$ 162.504,98", "Relatório diário não reconcilia com o total"],
        ["Produtividade com fórmula incorreta", "Contatos por cobrador aparecem zerados apesar de 4.995 tentativas registradas na base", "Avaliação de desempenho incorreta"],
        ["Ticket médio total incorreto", "A planilha soma tickets individuais e mostra R$ 668,88; a média global pelos dados é cerca de R$ 335,06", "Decisão baseada em métrica errada"],
        ["Dashboard incompleto", "Há fórmulas exibidas como texto, campos vazios e aba Faturamento sem preenchimento", "Não deve ser adotado como fonte oficial"],
    ],
    widths=[1.65, 3.05, 2.3],
    font_size=8.4,
)
add_source("Valores calculados a partir da Base de Cobrança e das abas de resumo da planilha analisada. As divergências são evidência de controle local e devem ser confirmadas antes de qualquer migração.")

# 5
doc.add_page_break()
doc.add_heading("5 Divergências que o dono precisa decidir", level=1)
add_table(
    ["Decisão", "Conflito encontrado", "Recomendação para validação"],
    [
        ["Fonte oficial", "A planilha, o sistema de origem e os portais possuem informações diferentes", "Definir qual fonte prevalece para dívida, pagamento e baixa"],
        ["Unidade de cobrança", "Planilha mistura cliente, apólice e competências; Kanban agrupa visualmente por cliente", "Adotar posição por título ou parcela, agrupada por cliente apenas na visualização"],
        ["Competência", "Importação usa um mês global; operação precisa da competência efetiva", "Manter ciclo da carga separado de uma ou mais competências da dívida"],
        ["Status", "Manual sugere dez status; CRM possui seis etapas", "Manter poucas etapas e criar substatus e motivos estruturados"],
        ["Meta de 70%", "Manual cita a meta, mas não define população, período, exclusões ou valor inicial", "Aprovar fórmula, base congelada e tratamento de ajustes"],
        ["Contato obrigatório", "Manual determina contato com todos; dados têm telefone ausente ou inválido", "Definir tentativas mínimas, canais alternativos e exceção justificável"],
        ["Prazo por carteira", "ASDER tem liberação estimada no dia 11 e prazo final no dia 5; Icatu não tem prazo final", "Resolver mês de referência e completar prazos antes de automatizar"],
        ["Responsáveis", "Manual cita responsáveis diferentes dos dois cobradores da planilha", "Definir papéis, pessoas e substituição por período"],
        ["SMS", "Reunião relata retorno positivo; manual prioriza WhatsApp, e-mail e telefone", "Decidir se SMS entra no piloto ou em fase posterior"],
        ["Encerramento sem pagamento", "Novo ciclo não deve repetir automaticamente a base anterior", "Fechar o ciclo com motivo e importar a base seguinte como nova ocorrência quando aplicável"],
    ],
    widths=[1.35, 2.85, 2.8],
    font_size=8.45,
)

# 6
doc.add_heading("6 Escopo essencial P0 para piloto controlado", level=1)
add_paragraph(
    "Os itens P0 formam o menor conjunto que permite operar sem depender de memória, conversas paralelas ou fórmulas frágeis. Eles não exigem integrar todos os canais nem automatizar todos os portais."
)

p0_rows = [
    ["P0 1", "Aprovação do processo e catálogo de carteiras", "Dono aprova responsáveis, prazos, meio de regularização, confirmação, comprovante e baixa de cada carteira."],
    ["P0 2", "Modelo de dados e importação da base oficial", "Cada posição preserva origem, ciclo, cliente, documento, matrícula, carteira, apólice, competência, valor, responsável, prazo e identificador externo."],
    ["P0 3", "Fluxo de status e encerramento", "Etapas, substatus, motivos e transições aprovados; encerramento exige motivo e histórico; reabertura é controlada."],
    ["P0 4", "Agenda e próxima ação", "Usuário visualiza o que vence primeiro, quem não respondeu, ações atrasadas e a próxima tentativa prevista."],
    ["P0 5", "Registro de pagamento e baixa", "Valor, data, forma, confirmação, evidência, responsável e encaminhamento para baixa são campos estruturados."],
    ["P0 6", "Disparo seguro de WhatsApp", "Seleção por carteira, ciclo, competência, etapa, prazo, operador, telefone e histórico de contato; preview e deduplicação permanecem obrigatórios."],
    ["P0 7", "Permissões e auditoria", "Importar, substituir, excluir ciclo, disparar em massa, marcar pagamento e concluir baixa seguem perfis aprovados e deixam trilha imutável."],
    ["P0 8", "Indicadores reconciliados", "Base inicial, contatos, respostas, promessas, pagamentos, valor recuperado e percentual conferem com os registros detalhados."],
    ["P0 9", "Saneamento mínimo de contatos", "Número principal é normalizado; múltiplos números são separados; número inválido ou ausente gera pendência visível."],
    ["P0 10", "Teste de ponta a ponta", "Uma amostra aprovada percorre importação, contato, resposta, pagamento, evidência, baixa, relatório e auditoria sem planilha paralela."],
]
add_table(["ID", "Requisito", "Critério de aceite"], p0_rows, widths=[0.65, 2.15, 4.2], font_size=8.5)

doc.add_heading("Detalhamento dos requisitos P0", level=2)
for title, bullets in [
    ("P0 1 Processo aprovado", [
        "Criar uma ficha por carteira com vigência e responsável pela aprovação.",
        "Registrar exceções e diferenças por produto, apólice ou meio de pagamento.",
        "Bloquear automações para carteira sem ficha aprovada.",
    ]),
    ("P0 2 Importação e reconciliação", [
        "Mostrar preview, total de linhas, valor total, registros aceitos, rejeitados e duplicidades antes de confirmar.",
        "Separar competência da dívida, competência ou ciclo da carga e data de liberação.",
        "Não agregar títulos distintos apenas porque pertencem ao mesmo CPF; permitir agrupamento somente na tela.",
        "Definir se uma linha repetida atualiza, cria nova posição ou exige decisão do usuário.",
    ]),
    ("P0 3 Fluxo controlado", [
        "Usar poucas colunas no Kanban e substatus para detalhes, evitando uma coluna para cada evento.",
        "Exigir motivo em encerrado sem pagamento, prazo encerrado, telefone inválido, duplicidade e cancelamento.",
        "Registrar automaticamente usuário, data, valor anterior e valor novo em alterações críticas.",
    ]),
    ("P0 4 Agenda operacional", [
        "Exibir prazo final, dias restantes, próxima ação, última tentativa e número de tentativas.",
        "Permitir fila por operador e carteira, com priorização por vencimento e valor.",
        "Distinguir sem contato, sem resposta, retorno recebido e pagamento a conferir.",
    ]),
    ("P0 5 Pagamento e evidência", [
        "Aceitar pagamento integral ou parcial sem transformar automaticamente o restante em zero.",
        "Registrar quem informou e quem confirmou o pagamento.",
        "Armazenar anexo ou, no mínimo, link controlado para SharePoint e identificador do comprovante.",
        "Distinguir pagamento identificado, confirmado, encaminhado para baixa e baixa concluída.",
    ]),
    ("P0 6 WhatsApp", [
        "Manter o aviso de que campanha aceita pelo fornecedor não significa mensagem entregue.",
        "Gravar template, destinatário, número, data, operador, exclusões e erro por posição.",
        "Impedir novo disparo indevido quando houver resposta, pagamento ou encerramento, salvo ação autorizada.",
    ]),
    ("P0 7 Governança", [
        "Separar cobrança, gestão, faturamento, administração e leitura.",
        "Não permitir exclusão silenciosa de atividade ou histórico; correções devem manter registro anterior.",
        "Ações em massa e alterações financeiras precisam de usuário identificável e justificativa quando aplicável.",
    ]),
    ("P0 8 Indicadores", [
        "Congelar a base inicial usada como denominador da recuperação e documentar ajustes.",
        "Permitir visão por dia, operador, carteira, ciclo e competência da dívida.",
        "Reconciliar cada total com os registros detalhados e sinalizar dados ausentes.",
    ]),
]:
    doc.add_heading(title, level=3)
    add_bullets(bullets)

# 7
doc.add_page_break()
doc.add_heading("7 Fluxo operacional mínimo proposto", level=1)
add_paragraph(
    "A estrutura abaixo é uma proposta para discussão. Ela reduz o número de colunas do Kanban e preserva o detalhe em substatus. A direção deve aprovar nomes, transições e responsáveis."
)
add_table(
    ["Etapa do Kanban", "Substatus ou evento", "Saída esperada"],
    [
        ["Nova posição", "Pendente de validação; disponível; prazo próximo", "Posição validada e atribuída"],
        ["Contato em andamento", "Contato realizado; sem retorno; retorno recebido; telefone inválido", "Resposta ou próxima tentativa definida"],
        ["Em negociação", "Orientação enviada; boleto ou PIX enviado; promessa de pagamento", "Pagamento esperado ou negociação encerrada"],
        ["Aguardando confirmação", "Pagamento informado; comprovante recebido; conferência em portal", "Pagamento confirmado ou pendência devolvida"],
        ["Encaminhado para baixa", "Faturamento; Inadimplência; baixa em processamento", "Baixa concluída"],
        ["Quitado", "Regularizado integral; regularizado parcial com saldo tratado", "Caso concluído com evidência"],
        ["Encerrado sem pagamento", "Prazo encerrado; não localizado; recusou; cancelamento; outra justificativa", "Caso fechado com motivo obrigatório"],
    ],
    widths=[1.55, 3.15, 2.3],
    font_size=8.7,
)

doc.add_heading("Regras mínimas de transição", level=2)
add_bullets([
    "O envio inicial de WhatsApp pode mover para Contato em andamento somente se o fornecedor aceitar a campanha e a regra estiver aprovada.",
    "Pagamento não deve ser sinônimo de Quitado antes da confirmação definida pela carteira.",
    "Prazo encerrado não deve apagar a posição; deve impedir novas ações indevidas e exigir motivo de fechamento ou decisão gerencial.",
    "A nova base mensal cria novo ciclo. Casos repetidos devem ser vinculados ao histórico anterior, sem copiar automaticamente o status anterior.",
    "Toda alteração crítica deve guardar usuário, data, dado anterior, dado novo e origem da ação.",
])

# 8
doc.add_heading("8 Dados mínimos por posição de cobrança", level=1)
add_table(
    ["Grupo", "Campos mínimos", "Observação"],
    [
        ["Identificação", "ID externo, cliente, CPF ou CNPJ, matrícula, apólice ou contrato", "Cliente pode ter várias posições"],
        ["Origem", "Carteira ou estipulante, produto, sistema de origem, arquivo e linha", "Permite rastrear importação"],
        ["Período", "Ciclo da carga, data de liberação e competência da dívida", "Competência pode exigir mais de um item"],
        ["Financeiro", "Valor inicial, saldo, valor recuperado, data e forma de pagamento", "Preservar parcial versus integral"],
        ["Prazo", "Limite de cobrança, dias restantes, regra aplicada", "Regra versionada por carteira"],
        ["Responsabilidade", "Operador, equipe, confirmador e responsável pela baixa", "Separar execução e confirmação quando necessário"],
        ["Contato", "Telefone(s), e-mail, canal, tentativas, última ação, resposta e próxima ação", "Telefones em registros separados"],
        ["Desfecho", "Etapa, substatus, motivo, evidência, baixa e data de encerramento", "Campos obrigatórios conforme o desfecho"],
    ],
    widths=[1.1, 3.65, 2.25],
    font_size=8.65,
)

doc.add_heading("Decisão sobre competência", level=2)
add_paragraph(
    "Recomendação. O ciclo da importação deve ser um identificador próprio, como Base recebida em outubro de 2026. A competência da dívida deve permanecer ligada à posição ou às parcelas que formam a posição. Quando uma linha contém várias competências, o sistema deve criar parcelas separadas quando houver valores individualizados ou manter uma lista estruturada com regra explícita quando o valor estiver agregado.",
    bold_lead="Recomendação. ",
)

# 9
doc.add_heading("9 Permissões e controles de confiança", level=1)
add_paragraph(
    "A preocupação da direção com confiabilidade deve ser tratada por controles verificáveis, não por dependência de uma pessoa. O sistema precisa impedir que uma única ação altere dívida, pagamento e resultado sem rastreabilidade."
)
add_table(
    ["Perfil", "Permissões sugeridas", "Restrições"],
    [
        ["Administrador", "Configuração técnica, usuários, integrações e catálogos", "Não altera resultado financeiro sem trilha"],
        ["Gestor de cobrança", "Distribuição, reabertura, exceções, disparos em massa e relatórios", "Não apaga histórico"],
        ["Cobrador", "Contatos, atividades, negociação e indicação de pagamento", "Não substitui base nem confirma baixa"],
        ["Faturamento", "Conferência, repasse, baixa e divergência", "Não muda contato ou carteira sem justificativa"],
        ["Consulta ou auditoria", "Leitura e exportação autorizada", "Sem alteração"],
    ],
    widths=[1.45, 3.5, 2.05],
    font_size=8.65,
)
add_bullets([
    "Restringir importação, substituição e exclusão de competência ou ciclo.",
    "Exigir confirmação antes de disparo em massa, com contagem e filtros visíveis.",
    "Registrar alteração de responsável, prazo, valor, status, pagamento, evidência e baixa.",
    "Substituir exclusão por cancelamento ou correção versionada quando a informação impactar indicadores.",
    "Revisar e trocar qualquer credencial compartilhada em reunião, teste ou transcrição; credenciais devem circular apenas por canal seguro.",
])

# 10
doc.add_page_break()
doc.add_heading("10 Indicadores mínimos e definições pendentes", level=1)
add_table(
    ["Indicador", "Definição proposta", "Decisão necessária"],
    [
        ["Base inicial", "Soma do valor elegível no início do ciclo", "Exclusões, ajustes e duplicidades"],
        ["Valor recuperado", "Pagamento confirmado no período", "Data usada: pagamento, confirmação ou baixa"],
        ["Percentual de recuperação", "Valor recuperado dividido pela base inicial aprovada", "Tratamento de carga tardia e estorno"],
        ["Contatados", "Posições com ao menos uma tentativa válida", "Canal válido e deduplicação por pessoa"],
        ["Taxa de resposta", "Posições com retorno dividido por posições contatadas", "O que conta como resposta"],
        ["Promessas", "Promessas ativas, vencidas e cumpridas", "Prazo e valor mínimo da promessa"],
        ["Pagamentos", "Quantidade de posições com pagamento confirmado", "Parcial versus integral"],
        ["Pendências sem desfecho", "Posições abertas no encerramento do ciclo", "Motivos e regra de fechamento"],
        ["Produtividade", "Contatos, retornos, pagamentos e valor por operador", "Não usar apenas volume de disparos"],
        ["SLA por carteira", "Percentual tratado antes do prazo final", "Calendário, feriados e exceções"],
    ],
    widths=[1.45, 3.4, 2.15],
    font_size=8.55,
)
add_paragraph(
    "A meta de 70% só deve aparecer como meta oficial depois de aprovada a fórmula. O denominador deve ser uma base inicial estável e rastreável. Somar ou remover posições durante o mês sem registrar ajustes altera artificialmente o percentual."
)

# 11
doc.add_heading("11 Itens para a segunda fase P1 e P2", level=1)
add_table(
    ["Prioridade", "Item", "Condição para iniciar"],
    [
        ["P1", "Painéis gerenciais avançados e comparação entre ciclos", "Indicadores básicos reconciliados"],
        ["P1", "Notificações de prazo, promessa vencida e pagamento a conferir", "Agenda e status estabilizados"],
        ["P1", "Integração de anexos com SharePoint", "Política de evidência e acesso aprovada"],
        ["P1", "Regras automáticas por carteira e distribuição de carga", "Catálogo de carteiras aprovado"],
        ["P1", "Exportações para Faturamento e fechamento", "Campos de baixa e repasse definidos"],
        ["P2", "Recebimento automático de respostas do WhatsApp e conversa dentro do CRM", "Webhook e regras de atendimento aprovados"],
        ["P2", "SMS, e-mail e ligação integrados", "Prioridade e retorno financeiro demonstrados"],
        ["P2", "Integração direta com o sistema de origem sem planilha", "Fonte oficial e API disponíveis"],
        ["P2", "Conferência automática em portais de pagamento", "Viabilidade técnica, segurança e autorização"],
        ["P2", "Automação de baixa e faturamento", "Segregação de funções e conciliação aprovadas"],
        ["P2", "Análise de qualidade de contato e enriquecimento de dados", "Base legal, fornecedor e política de uso aprovados"],
    ],
    widths=[0.8, 3.55, 2.65],
    font_size=8.55,
)
add_paragraph(
    "O recebimento automático de respostas do WhatsApp é valioso, mas não precisa bloquear o primeiro piloto. Enquanto essa integração não existir, o retorno pode ser registrado manualmente, com próxima ação e operador responsável. SMS e ligação também podem permanecer fora do piloto inicial se a direção quiser reduzir escopo."
)

# 12
doc.add_heading("12 Plano de implantação recomendado", level=1)
add_table(
    ["Etapa", "Objetivo", "Saída"],
    [
        ["A Validação executiva", "Resolver as decisões deste documento", "Ata de requisitos e catálogo aprovado"],
        ["B Preparação do piloto", "Implementar P0, importar amostra e configurar perfis", "Ambiente pronto e roteiro de testes"],
        ["C Piloto assistido", "Operar carteira escolhida do início ao fim", "Evidências, falhas e ajustes priorizados"],
        ["D Aceite operacional", "Reconciliar resultados e aprovar procedimento", "Decisão de ampliar, corrigir ou interromper"],
        ["E Expansão gradual", "Adicionar carteiras, usuários e automações", "Adoção controlada sem retorno à planilha paralela"],
    ],
    widths=[1.55, 3.2, 2.25],
    font_size=8.75,
)

doc.add_heading("Critérios de aceite do piloto", level=2)
add_bullets([
    "Todos os registros da amostra reconciliam em quantidade e valor com a fonte aprovada.",
    "Nenhuma mensagem é enviada fora dos filtros e destinatários confirmados no preview.",
    "Cada contato e mudança de etapa possui usuário e data.",
    "Pagamentos e baixas podem ser rastreados até a evidência e a pessoa que confirmou.",
    "A fila mostra casos sem contato, sem resposta, com promessa vencida e próximos do prazo.",
    "Indicadores por dia, operador e carteira conferem com os casos detalhados.",
    "Usuários não autorizados não conseguem substituir base, excluir ciclo, disparar em massa ou concluir baixa.",
    "A operação consegue concluir o ciclo escolhido sem atualizar uma planilha paralela para compensar campos ausentes.",
])

# 13
doc.add_page_break()
doc.add_heading("13 Pauta de validação com o dono", level=1)
add_paragraph("A reunião de validação deve produzir decisões registradas para os itens abaixo.")
questions = [
    "Qual sistema ou documento é a fonte oficial da dívida em aberto?",
    "A posição será controlada por parcela, apólice, cliente ou outro identificador?",
    "Como distinguir ciclo da base, competência da dívida e data de vencimento?",
    "Quais carteiras entram no piloto e quem aprova suas regras?",
    "Quais são os prazos finais e meios de regularização de cada carteira?",
    "Quais status e motivos de encerramento são oficiais?",
    "O envio de WhatsApp move automaticamente a etapa?",
    "Quantas tentativas e quais canais são obrigatórios antes do encerramento?",
    "O que caracteriza resposta, promessa, pagamento identificado, pagamento confirmado e baixa concluída?",
    "Quais carteiras exigem comprovante e onde ele deve ser armazenado?",
    "Quem pode indicar pagamento, confirmar pagamento e concluir baixa?",
    "Quando o Faturamento participa e o que precisa receber?",
    "Como tratar pagamento parcial, estorno, divergência e cancelamento?",
    "Como tratar cliente repetido na base seguinte sem carregar automaticamente a cobrança anterior?",
    "Qual é a definição oficial da meta de 70%?",
    "Quais exclusões podem reduzir a base inicial e quem as aprova?",
    "Quais filtros são obrigatórios antes de um disparo em massa?",
    "Quais perfis podem importar, substituir, excluir, disparar e exportar dados?",
    "Quais relatórios o dono precisa acompanhar diariamente e no fechamento?",
    "Qual período de retenção e quais regras de acesso se aplicam a mensagens, comprovantes e dados pessoais?",
]
add_numbered(questions)

doc.add_heading("Resultado esperado da reunião", level=2)
add_bullets([
    "Lista de decisões aprovadas, rejeitadas e pendentes.",
    "Nome do aprovador e data de vigência de cada regra.",
    "Carteira e amostra do piloto.",
    "Prioridade dos itens P0 e responsável por cada definição.",
    "Critérios de aceite e data da revisão do piloto.",
])

# 14
doc.add_heading("14 Riscos se o CRM entrar em produção sem o P0", level=1)
add_table(
    ["Risco", "Efeito provável", "Controle preventivo"],
    [
        ["Competência incorreta", "Cobrança com informação errada ao cliente", "Importar competência real e validar amostra"],
        ["Prazo perdido", "Impossibilidade de regularização e queda da recuperação", "Agenda por carteira e alerta"],
        ["Disparo indevido", "Contato com pessoa ou posição errada", "Filtros, preview, deduplicação e permissão"],
        ["Pagamento não confirmado", "Caso marcado como quitado sem evidência", "Estados separados e confirmação por perfil"],
        ["Métrica manipulável", "Gestão avalia desempenho com base instável", "Denominador congelado e trilha de ajustes"],
        ["Exclusão ou alteração sem rastro", "Perda de confiança e dificuldade de auditoria", "Histórico imutável e correção versionada"],
        ["Dependência da planilha", "Dupla digitação e divergência entre fontes", "Piloto ponta a ponta com reconciliação"],
        ["Dados de contato ruins", "Baixa efetividade e duplicidade", "Normalização e pendência de qualidade"],
    ],
    widths=[1.7, 2.65, 2.65],
    font_size=8.65,
)

# Appendix
doc.add_page_break()
doc.add_heading("Apêndice A Matriz de rastreabilidade", level=1)
add_table(
    ["Requisito", "Código atual", "Reunião", "Manual", "Planilha"],
    [
        ["Kanban e etapas", "Sim", "Sim", "Status", "Situação2"],
        ["Competência real", "Parcial", "Sim", "Sim", "Sim"],
        ["Prazo por carteira", "Parcial", "Sim", "Sim", "Sim"],
        ["Múltiplos canais", "Atividade manual", "Sim", "Sim", "Meio Contato"],
        ["WhatsApp em massa", "Sim", "Sim", "Sim", "Exportação manual"],
        ["Resposta do cliente", "Não automática", "Sim", "Sim", "Situação2 e observação"],
        ["Comprovante", "Não", "Sim", "Sim", "Observação"],
        ["Pagamento estruturado", "Não", "Sim", "Sim", "Sim"],
        ["Baixa e repasse", "Não", "Sim", "Sim", "Aba incompleta"],
        ["Produtividade diária", "Não", "Sim", "Indicadores", "Sim com inconsistências"],
        ["Permissões por função", "Parcial", "Preocupação do dono", "Não detalha", "Não"],
    ],
    widths=[2.05, 1.25, 1.0, 1.25, 1.45],
    font_size=8.3,
)

doc.add_heading("Apêndice B Fontes consultadas", level=1)
sources = [
    "S1 Código-fonte do CRM em C:\\BRAVIDA\\CRM, revisão estática em 29/10/2026. Arquivos principais: páginas de Negócios, Contatos, Importação e WhatsApp; serviços de frontend; controllers, consultas, comandos, migrações e integração WhatsApp do backend.",
    "S2 Transcrição Daniele CRM 2026-10-26 16-22-39.txt. Usada somente para identificar necessidades e práticas relatadas. Credenciais ou dados pessoais presentes na transcrição não foram reproduzidos.",
    "S3 ManualOperacionalRecuperacaoInadimplencia_2409_ATUALIZADO.docx. Usado como processo documentado sujeito a validação da direção.",
    "S4 Inadimplencia Unificada setembro 2026 (2).xlsx. Usada para mapear campos, volume, práticas e qualidade dos controles. O arquivo original não foi alterado.",
]
add_bullets(sources)

doc.add_heading("Apêndice C Limites desta análise", level=1)
add_bullets([
    "A análise do CRM foi feita sobre o código disponível e não substitui teste com banco e integrações em produção.",
    "O manual e a reunião não foram tratados como autorização da empresa.",
    "Os números da planilha foram usados para diagnóstico do controle; não foram certificados como resultado financeiro oficial.",
    "O documento não define obrigação legal. Privacidade, consentimento, retenção e uso de canais devem ser revisados pela área responsável da empresa.",
])

# Final cleanup
for paragraph in doc.paragraphs:
    paragraph.paragraph_format.widow_control = True

doc.core_properties.title = "Diagnóstico de prontidão do CRM de recuperação de inadimplência"
doc.core_properties.subject = "Escopo mínimo para piloto e validação executiva"
doc.core_properties.comments = "Documento criado a partir do sistema atual e das fontes fornecidas, sem reproduzir credenciais ou dados pessoais."

doc.save(OUTPUT)
print(OUTPUT)
