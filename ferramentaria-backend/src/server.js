require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');
const { iniciarBackupDiario } = require('./utils/backup');
const { garantirEstrutura } = require('./db/estrutura');

const PORT = process.env.PORT || 3000;

garantirEstrutura(pool)
  .catch((err) => console.error('Não foi possível atualizar a estrutura do banco:', err.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`API da Ferramentaria rodando em http://localhost:${PORT}`);
      iniciarBackupDiario(pool);
    });
  });
