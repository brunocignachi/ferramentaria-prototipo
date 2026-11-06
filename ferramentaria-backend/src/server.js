require('dotenv').config();
const app = require('./app');
const pool = require('./config/db');
const { iniciarBackupDiario } = require('./utils/backup');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API da Ferramentaria rodando em http://localhost:${PORT}`);
  iniciarBackupDiario(pool);
});
