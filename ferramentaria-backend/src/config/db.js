const { Pool } = require('pg');

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
  : new Pool();

pool.on('error', (err) => {
  console.error('Erro inesperado no pool do PostgreSQL:', err);
});

module.exports = pool;
