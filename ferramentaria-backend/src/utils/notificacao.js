// Avisos gravados na mesma transação da ação que os gerou: se a ação for
// desfeita (ROLLBACK), o aviso também some.

const TAMANHO_MAXIMO = 300;

// Nome da peça nos avisos: a descrição, ou o desenho quando não há descrição.
function nomeDaPeca(solicitacao) {
  const nome = solicitacao.descricao?.trim() || solicitacao.numero_desenho;
  return nome.length > 80 ? `${nome.slice(0, 77)}...` : nome;
}

// Grava um aviso para cada destinatário, sem repetir e sem avisar quem fez a ação.
async function notificar(client, { destinatarios, idAutor, idSolicitacao, tipo, mensagem }) {
  const unicos = [...new Set(destinatarios.filter(Boolean).map(Number))].filter((id) => id !== Number(idAutor));
  if (unicos.length === 0) return;
  await client.query(
    `INSERT INTO notificacao (id_usuario, id_solicitacao, tipo, mensagem)
     SELECT destinatario, $2, $3, $4 FROM unnest($1::int[]) AS destinatario`,
    [unicos, idSolicitacao, tipo, mensagem.slice(0, TAMANHO_MAXIMO)]
  );
}

// Operadores com alguma etapa na solicitação.
async function operadoresDaSolicitacao(client, idSolicitacao) {
  const { rows } = await client.query(
    `SELECT DISTINCT id_operador FROM processo_solicitacao
     WHERE id_solicitacao = $1 AND id_operador IS NOT NULL`,
    [idSolicitacao]
  );
  return rows.map((linha) => linha.id_operador);
}

module.exports = { nomeDaPeca, notificar, operadoresDaSolicitacao };
