require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Inserindo dados iniciais...');

    const senhaHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO usuario (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, 'administrador')
       ON CONFLICT (email) DO NOTHING`,
      ['Administrador', 'admin@ferramentaria.local', senhaHash]
    );

    const tiposProcesso = [
      ['Torno', 'Processo de usinagem em torno mecânico'],
      ['Fresa', 'Processo de usinagem em fresadora'],
      ['Retífica', 'Processo de retificação de peças'],
    ];

    for (const [nome, descricao] of tiposProcesso) {
      await client.query(
        `INSERT INTO tipo_processo (nome, descricao)
         SELECT $1::varchar, $2::varchar
         WHERE NOT EXISTS (SELECT 1 FROM tipo_processo WHERE nome = $1::varchar)`,
        [nome, descricao]
      );
    }

    console.log('Seed concluído.');
    console.log('Login administrador: admin@ferramentaria.local / senha: admin123');
  } catch (err) {
    console.error('Erro ao popular o banco:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
