const express = require('express');
const { autenticar } = require('../middleware/auth');
const { login, trocarSenha } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.patch('/senha', autenticar, trocarSenha);

module.exports = router;
