const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const processoController = require('../controllers/processoController');

const router = express.Router();

router.use(autenticar);

router.get('/fila', processoController.fila);

router.patch('/:id/atribuir', autorizar('administrador'), processoController.atribuir);

router.patch('/:id/iniciar', autorizar('operador', 'administrador'), processoController.iniciar);

router.patch('/:id/concluir', autorizar('operador', 'administrador'), processoController.concluir);

module.exports = router;
