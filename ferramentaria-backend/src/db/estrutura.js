// Atualizações de estrutura aplicadas quando a API inicia. Usam IF NOT EXISTS,
// então só acrescentam o que falta em um banco criado por uma versão anterior
// do schema.sql, sem tocar nos dados existentes.
const ATUALIZACOES = [
  `CREATE TABLE IF NOT EXISTS notificacao (
     id_notificacao SERIAL PRIMARY KEY,
     id_usuario     INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
     id_solicitacao INT REFERENCES solicitacao(id_solicitacao) ON DELETE CASCADE,
     tipo           VARCHAR(30) NOT NULL,
     mensagem       VARCHAR(300) NOT NULL,
     lida           BOOLEAN NOT NULL DEFAULT FALSE,
     criada_em      TIMESTAMP NOT NULL DEFAULT NOW()
   )`,
  'CREATE INDEX IF NOT EXISTS idx_notificacao_usuario ON notificacao(id_usuario, lida, criada_em)',
];

async function garantirEstrutura(pool) {
  for (const sql of ATUALIZACOES) {
    await pool.query(sql);
  }
}

module.exports = { garantirEstrutura };
