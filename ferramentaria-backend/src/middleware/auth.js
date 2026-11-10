const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Além de validar o token, confere no banco se o usuário continua ativo e com
// o mesmo perfil: desativar ou mudar o perfil de alguém vale na hora, não só
// quando o token expirar.
async function autenticar(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não informado.' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }

  try {
    const { rows } = await pool.query('SELECT nome, perfil, ativo FROM usuario WHERE id_usuario = $1', [payload.id]);
    const usuario = rows[0];
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Este acesso foi desativado. Fale com um administrador.', acesso_revogado: true });
    }
    req.usuario = { ...payload, nome: usuario.nome, perfil: usuario.perfil };
    next();
  } catch (err) {
    next(err);
  }
}

function autorizar(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado.' });
    }
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Perfil sem permissão para esta operação.' });
    }
    next();
  };
}

module.exports = { autenticar, autorizar };
