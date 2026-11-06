const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const solicitacaoController = require('../controllers/solicitacaoController');
const processoController = require('../controllers/processoController');
const anexoController = require('../controllers/anexoController');
const { receberArquivo } = require('../middleware/upload');

const router = express.Router();

router.use(autenticar);
router.post('/', autorizar('solicitante', 'administrador'), solicitacaoController.criar);
router.get('/', solicitacaoController.listar);
router.get('/:id', solicitacaoController.buscarPorId);
router.patch('/:id', autorizar('solicitante', 'administrador'), solicitacaoController.atualizar);
router.delete('/:id', autorizar('solicitante', 'administrador'), solicitacaoController.cancelar);
router.delete('/:id/permanente', autorizar('administrador'), solicitacaoController.excluirPermanente);
router.post(
  '/:id/anexos',
  autorizar('solicitante', 'administrador'),
  anexoController.validarEnvio,
  receberArquivo,
  anexoController.enviar
);
router.post('/:id/processos', autorizar('solicitante', 'administrador'), processoController.adicionar);
router.put('/:id/processos/ordem', autorizar('solicitante', 'administrador'), processoController.reordenar);

module.exports = router;
