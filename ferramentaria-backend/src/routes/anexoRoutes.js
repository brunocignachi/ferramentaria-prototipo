const express = require('express');
const { autenticar, autorizar } = require('../middleware/auth');
const anexoController = require('../controllers/anexoController');

const router = express.Router();

router.use(autenticar);
router.get('/:id/download', anexoController.baixar);
router.delete('/:id', autorizar('solicitante', 'administrador'), anexoController.remover);

module.exports = router;
