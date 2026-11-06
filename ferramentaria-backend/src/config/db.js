const { Pool, types } = require('pg');

// As colunas TIMESTAMP não guardam fuso e o banco grava em UTC. Sem este parser,
// o driver as leria como horário local, adiantando os horários em 3 horas.
const OID_TIMESTAMP = 1114;
types.setTypeParser(OID_TIMESTAMP, (valor) => new Date(`${valor.replace(' ', 'T')}Z`));

// Se DATABASE_URL estiver definida (caso de bancos na nuvem, como Neon,
// Supabase, Render etc.), ela tem prioridade e é usada com SSL habilitado,
// que esses provedores exigem. Caso contrário, a biblioteca "pg" lê
// PGHOST, PGPORT, PGDATABASE, PGUSER e PGPASSWORD automaticamente —
// útil para um PostgreSQL rodando localmente ou em Docker.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({ options: '-c timezone=UTC' });

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = pool;
