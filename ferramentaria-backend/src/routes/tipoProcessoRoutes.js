const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const tipoProcessoController = require('../controllers/tipoProcessoController');

const router = express.Router();

router.use(autenticar);

router.get('/', tipoProcessoController.listar);
router.post('/', autorizar('administrador'), tipoProcessoController.criar);
router.patch('/:id', autorizar('administrador'), tipoProcessoController.atualizar);

module.exports = router;
