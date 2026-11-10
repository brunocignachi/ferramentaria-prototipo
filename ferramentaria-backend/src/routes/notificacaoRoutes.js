const express = require('express');
const { autenticar } = require('../middleware/auth');
const notificacaoController = require('../controllers/notificacaoController');

const router = express.Router();

// Todo perfil recebe avisos; cada usuário só vê e altera os próprios.
router.use(autenticar);
router.get('/', notificacaoController.listar);
router.get('/resumo', notificacaoController.resumo);
router.patch('/lidas', notificacaoController.marcarTodasLidas);
router.patch('/:id/lida', notificacaoController.marcarLida);

module.exports = router;
