const express = require('express');

const authRoutes = require('./authRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const tipoProcessoRoutes = require('./tipoProcessoRoutes');
const solicitacaoRoutes = require('./solicitacaoRoutes');
const processoRoutes = require('./processoRoutes');
const anexoRoutes = require('./anexoRoutes');
const relatorioRoutes = require('./relatorioRoutes');
const notificacaoRoutes = require('./notificacaoRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/tipos-processo', tipoProcessoRoutes);
router.use('/solicitacoes', solicitacaoRoutes);
router.use('/processos', processoRoutes);
router.use('/anexos', anexoRoutes);
router.use('/relatorios', relatorioRoutes);
router.use('/notificacoes', notificacaoRoutes);

module.exports = router;
