require('dotenv').config();
const pool = require('../src/config/db');
const { restaurarBackup } = require('../src/utils/backup');

// Uso: npm run db:restore -- backups/arquivo.json --confirmar
// Apaga todos os dados atuais do banco e os substitui pelos do backup.
const argumentos = process.argv.slice(2);
const arquivo = argumentos.find((arg) => !arg.startsWith('--'));

if (!arquivo || !argumentos.includes('--confirmar')) {
  console.error('Isto apaga todos os dados atuais do banco.');
  console.error('Uso: npm run db:restore -- backups/arquivo.json --confirmar');
  process.exitCode = 1;
  pool.end();
} else {
  restaurarBackup(pool, arquivo)
    .then(() => console.log(`Banco restaurado a partir de ${arquivo}.`))
    .catch((err) => {
      console.error('Erro ao restaurar o backup:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
