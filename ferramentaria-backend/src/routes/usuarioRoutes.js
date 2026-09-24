const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

router.use(autenticar);

router.get('/', autorizar('administrador'), usuarioController.listar);
router.post('/', autorizar('administrador'), usuarioController.criar);
router.patch('/:id', autorizar('administrador'), usuarioController.atualizar);
router.delete('/:id', autorizar('administrador'), usuarioController.excluir);

module.exports = router;
