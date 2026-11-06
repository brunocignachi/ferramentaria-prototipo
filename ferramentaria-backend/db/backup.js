require('dotenv').config();
const pool = require('../src/config/db');
const { gerarBackup } = require('../src/utils/backup');

gerarBackup(pool)
  .then((arquivo) => console.log(`Backup gerado: ${arquivo}`))
  .catch((err) => {
    console.error('Erro ao gerar o backup:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
