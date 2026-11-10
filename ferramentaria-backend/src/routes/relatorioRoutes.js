const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const relatorioController = require('../controllers/relatorioController');

const router = express.Router();

router.use(autenticar);
router.get('/solicitacoes', autorizar('administrador'), relatorioController.solicitacoes);
router.get('/indicadores', autorizar('administrador'), relatorioController.indicadores);

module.exports = router;
