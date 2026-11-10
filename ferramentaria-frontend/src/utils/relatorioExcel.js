import { PRIORIDADE_LABEL, STATUS_SOLICITACAO_LABEL, situacaoDoPrazo } from './solicitacao';

const VERDE_ESCURO = 'FF0F3D2E';
const CINZA_BORDA = 'FFD1D5DB';

// O Excel guarda datas sem fuso: grava o dia como ele aparece no Brasil.
function diaDoInstante(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  return new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
}

// Prazo já é uma data sem horário (AAAA-MM-DD).
function diaDoPrazo(valor) {
  if (!valor) return null;
  const [ano, mes, dia] = String(valor).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function estilizarCabecalho(linha) {
  linha.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  linha.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE_ESCURO } };
  linha.alignment = { vertical: 'middle' };
  linha.height = 20;
}

function montarResumo(planilha, { resumo, filtros, geradoEm }) {
  planilha.columns = [{ width: 34 }, { width: 18 }];
  planilha.addRow(['Relatório de solicitações — Ferramentaria']).font = { bold: true, size: 14 };
  planilha.addRow([filtros]);
  planilha.addRow([`Gerado em ${geradoEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`]);
  planilha.addRow([]);

  estilizarCabecalho(planilha.addRow(['Indicador', 'Valor']));
  const linhas = [
    ['Solicitações', resumo.total],
    ['Concluídas', resumo.concluidas],
    ['Concluídas no prazo', resumo.concluidas_no_prazo],
    ['Concluídas com atraso', resumo.concluidas_com_atraso],
    ['Abertas em atraso', resumo.em_atraso],
    ['Canceladas', resumo.canceladas],
  ];
  for (const valores of linhas) planilha.addRow(valores);

  // OTD como porcentagem de verdade, para o Excel poder calcular com ela.
  const otd = planilha.addRow([
    'On-Time Delivery (concluídas no prazo)',
    resumo.otd_percentual === null ? '—' : resumo.otd_percentual / 100,
  ]);
  otd.getCell(2).numFmt = '0.0%';
  otd.font = { bold: true };
}

function montarTabela(planilha, solicitacoes) {
  planilha.columns = [
    { header: 'Desenho', key: 'desenho', width: 16 },
    { header: 'Descrição', key: 'descricao', width: 32 },
    { header: 'Quantidade', key: 'quantidade', width: 11 },
    { header: 'Status', key: 'status', width: 13 },
    { header: 'Prioridade', key: 'prioridade', width: 11 },
    { header: 'Abertura', key: 'abertura', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Prazo', key: 'prazo', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Conclusão', key: 'conclusao', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Situação do prazo', key: 'situacao', width: 17 },
    { header: 'Solicitante', key: 'solicitante', width: 20 },
    { header: 'Operadores', key: 'operadores', width: 26 },
  ];
  estilizarCabecalho(planilha.getRow(1));

  for (const s of solicitacoes) {
    planilha.addRow({
      desenho: s.numero_desenho,
      descricao: s.descricao ?? '',
      quantidade: Number(s.quantidade),
      status: STATUS_SOLICITACAO_LABEL[s.status],
      prioridade: PRIORIDADE_LABEL[s.prioridade],
      abertura: diaDoInstante(s.data_abertura),
      prazo: diaDoPrazo(s.data_prazo),
      conclusao: diaDoInstante(s.data_conclusao),
      situacao: situacaoDoPrazo(s),
      solicitante: s.nome_solicitante,
      operadores: s.operadores ?? '',
    });
  }

  planilha.eachRow((linha) => {
    linha.eachCell({ includeEmpty: true }, (celula) => {
      celula.border = { bottom: { style: 'thin', color: { argb: CINZA_BORDA } } };
    });
  });
  planilha.views = [{ state: 'frozen', ySplit: 1 }]; // cabeçalho fixo ao rolar
  planilha.autoFilter = { from: 'A1', to: { row: 1, column: planilha.columns.length } };
}

/**
 * Gera o relatório exibido na tela em .xlsx e inicia o download. A biblioteca
 * só é carregada no clique, para não pesar na abertura do site.
 */
export async function baixarRelatorioExcel({ relatorio, filtros, geradoEm }) {
  const modulo = await import('exceljs');
  const ExcelJS = modulo.default ?? modulo;

  const pasta = new ExcelJS.Workbook();
  pasta.creator = 'Ferramentaria — Gestão de Solicitações';
  pasta.created = geradoEm;
  montarResumo(pasta.addWorksheet('Resumo'), { resumo: relatorio.resumo, filtros, geradoEm });
  montarTabela(pasta.addWorksheet('Solicitações'), relatorio.solicitacoes);

  const conteudo = await pasta.xlsx.writeBuffer();
  const arquivo = new Blob([conteudo], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dia = geradoEm.toLocaleDateString('pt-BR').split('/').reverse().join('-');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(arquivo);
  link.download = `relatorio-solicitacoes-${dia}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
