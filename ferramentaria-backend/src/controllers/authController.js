const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const validar = require('../utils/validacao');

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe email e senha.' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM usuario WHERE LOWER(email) = LOWER($1) AND ativo = TRUE',
      [String(email).trim()]
    );
    const usuario = rows[0];

    if (!usuario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaConfere) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, nome: usuario.nome, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/senha — o próprio usuário troca a senha, informando a atual.
async function trocarSenha(req, res, next) {
  try {
    const { senha_atual, senha_nova } = req.body;
    if (!senha_atual) {
      return res.status(400).json({ erro: 'Informe a senha atual.' });
    }
    const invalida = validar.senha(senha_nova);
    if (invalida) {
      return res.status(400).json({ erro: invalida.replace('Senha é obrigatória.', 'Informe a nova senha.') });
    }
    if (senha_nova === senha_atual) {
      return res.status(400).json({ erro: 'A nova senha deve ser diferente da atual.' });
    }

    const { rows } = await pool.query('SELECT senha_hash FROM usuario WHERE id_usuario = $1', [req.usuario.id]);
    if (!rows[0] || !(await bcrypt.compare(senha_atual, rows[0].senha_hash))) {
      return res.status(400).json({ erro: 'A senha atual não confere.' });
    }

    const senhaHash = await bcrypt.hash(senha_nova, 10);
    await pool.query('UPDATE usuario SET senha_hash = $1 WHERE id_usuario = $2', [senhaHash, req.usuario.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { login, trocarSenha };
