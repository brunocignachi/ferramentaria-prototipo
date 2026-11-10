const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', routes);

// Em produção (ex.: Render) o mesmo servidor entrega o site já compilado, então
// site e API ficam no mesmo endereço. Em desenvolvimento o site roda pelo Vite.
const SITE_DIR = path.join(__dirname, '..', '..', 'ferramentaria-frontend', 'dist');
if (fs.existsSync(path.join(SITE_DIR, 'index.html'))) {
  app.use(express.static(SITE_DIR));
  // Endereços como /solicitacoes/5 são telas do React: devolve o index.html.
  app.get('*', (req, res, next) => {
    if (req.path === '/api' || req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(SITE_DIR, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use(errorHandler);

module.exports = app;
