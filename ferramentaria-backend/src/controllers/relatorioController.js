const pool = require('../config/db');

const STATUS_VALIDOS = ['aberta', 'em_andamento', 'concluida', 'cancelada'];
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// As colunas TIMESTAMP estão em UTC; prazos e períodos valem no horário da fábrica.
const diaLocal = (coluna) => `(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date`;
const HOJE_LOCAL = `(NOW() AT TIME ZONE 'America/Sao_Paulo')::date`;

// GET /api/relatorios/solicitacoes?data_inicio=&data_fim=&status=&id_operador=
// Relatório por período de abertura, status e operador, com o indicador
// On-Time Delivery das peças concluídas (RF09, UC13, E10).
async function solicitacoes(req, res, next) {
  try {
    const { data_inicio, data_fim, status, id_operador } = req.query;

    for (const data of [data_inicio, data_fim]) {
      if (data && (!FORMATO_DATA.test(data) || Number.isNaN(Date.parse(data)))) {
        return res.status(400).json({ erro: 'Informe as datas no formato AAAA-MM-DD.' });
      }
    }
    if (data_inicio && data_fim && data_inicio > data_fim) {
      return res.status(400).json({ erro: 'A data inicial não pode ser posterior à data final.' });
    }
    if (status && !STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ erro: `status deve ser um de: ${STATUS_VALIDOS.join(', ')}` });
    }
    if (id_operador && !/^\d+$/.test(id_operador)) {
      return res.status(400).json({ erro: 'id_operador inválido.' });
    }

    const condicoes = [];
    const valores = [];
    let i = 1;
    if (data_inicio) { condicoes.push(`${diaLocal('s.data_abertura')} >= $${i++}::date`); valores.push(data_inicio); }
    if (data_fim) { condicoes.push(`${diaLocal('s.data_abertura')} <= $${i++}::date`); valores.push(data_fim); }
    if (status) { condicoes.push(`s.status = $${i++}::status_solicitacao`); valores.push(status); }
    if (id_operador) {
      condicoes.push(`EXISTS (
        SELECT 1 FROM processo_solicitacao filtro
        WHERE filtro.id_solicitacao = s.id_solicitacao AND filtro.id_operador = $${i++}
      )`);
      valores.push(id_operador);
    }
    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT s.id_solicitacao, s.numero_desenho, s.descricao, s.quantidade, s.prioridade, s.status,
              s.data_abertura, s.data_prazo, s.data_conclusao,
              u.nome AS nome_solicitante,
              (SELECT string_agg(DISTINCT op.nome, ', ')
               FROM processo_solicitacao p
               JOIN usuario op ON op.id_usuario = p.id_operador
               WHERE p.id_solicitacao = s.id_solicitacao) AS operadores,
              COALESCE(s.status = 'concluida' AND ${diaLocal('s.data_conclusao')} <= s.data_prazo, FALSE) AS concluida_no_prazo,
              COALESCE(s.status IN ('aberta', 'em_andamento') AND s.data_prazo < ${HOJE_LOCAL}, FALSE) AS em_atraso
       FROM solicitacao s
       JOIN usuario u ON u.id_usuario = s.id_solicitante
       ${where}
       ORDER BY s.data_abertura DESC, s.id_solicitacao DESC`,
      valores
    );

    const concluidas = rows.filter((s) => s.status === 'concluida').length;
    const noPrazo = rows.filter((s) => s.concluida_no_prazo).length;

    res.json({
      resumo: {
        total: rows.length,
        concluidas,
        concluidas_no_prazo: noPrazo,
        concluidas_com_atraso: concluidas - noPrazo,
        em_atraso: rows.filter((s) => s.em_atraso).length,
        canceladas: rows.filter((s) => s.status === 'cancelada').length,
        // Sem peças concluídas não há o que medir: fica nulo em vez de 0%.
        otd_percentual: concluidas ? Math.round((noPrazo / concluidas) * 1000) / 10 : null,
      },
      solicitacoes: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { solicitacoes };
