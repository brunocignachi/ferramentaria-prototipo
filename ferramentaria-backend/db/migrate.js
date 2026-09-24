require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    console.log('Aplicando schema.sql no banco...');
    await pool.query(sql);
    console.log('Migração concluída com sucesso.');
  } catch (err) {
    console.error('Erro ao aplicar a migração:', err.message || err.code || err);
if (err.errors) {
  err.errors.forEach((e, i) => console.error(`  causa ${i + 1}:`, e.message || e));
}
if (err.stack) console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
