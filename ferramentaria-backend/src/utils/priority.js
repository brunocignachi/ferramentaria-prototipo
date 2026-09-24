const PRIORIDADE_RANK_SQL = `
  CASE s.prioridade
    WHEN 'urgente' THEN 0
    WHEN 'alta'    THEN 1
    WHEN 'normal'  THEN 2
    WHEN 'baixa'   THEN 3
  END
`;

const ORDER_BY_PRIORIDADE = `ORDER BY ${PRIORIDADE_RANK_SQL} ASC, s.data_prazo ASC`;

module.exports = { PRIORIDADE_RANK_SQL, ORDER_BY_PRIORIDADE };
