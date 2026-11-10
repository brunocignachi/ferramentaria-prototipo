const PRIORIDADE_RANK_SQL = `
  CASE s.prioridade
    WHEN 'urgente' THEN 0
    WHEN 'alta'    THEN 1
    WHEN 'normal'  THEN 2
    WHEN 'baixa'   THEN 3
  END
`;

// RF06: prioridade, depois prazo. Em caso de empate, a solicitação aberta há
// mais tempo vem primeiro, para a ordem não variar entre um carregamento e outro.
const ORDER_BY_PRIORIDADE = `ORDER BY ${PRIORIDADE_RANK_SQL} ASC, s.data_prazo ASC, s.data_abertura ASC, s.id_solicitacao ASC`;

// Quando a solicitação foi encerrada: a conclusão, ou o cancelamento registrado no histórico.
const DATA_ENCERRAMENTO_SQL = `
  COALESCE(
    s.data_conclusao,
    (SELECT MAX(h.alterado_em) FROM historico_status h
     WHERE h.entidade = 'solicitacao' AND h.id_entidade = s.id_solicitacao AND h.status_novo = 'cancelada'),
    s.data_abertura
  )
`;

const ENCERRADA_SQL = `s.status IN ('concluida', 'cancelada')`;

// Lista geral de solicitações: primeiro as ativas, pela regra do RF06; depois
// as encerradas, da encerrada mais recentemente para a mais antiga.
const ORDER_BY_LISTA = `
  ORDER BY ${ENCERRADA_SQL} ASC,
    CASE WHEN NOT ${ENCERRADA_SQL} THEN ${PRIORIDADE_RANK_SQL} END ASC,
    CASE WHEN NOT ${ENCERRADA_SQL} THEN s.data_prazo END ASC,
    CASE WHEN ${ENCERRADA_SQL} THEN ${DATA_ENCERRAMENTO_SQL} END DESC,
    s.data_abertura ASC, s.id_solicitacao ASC
`;

module.exports = { PRIORIDADE_RANK_SQL, ORDER_BY_PRIORIDADE, ORDER_BY_LISTA };
