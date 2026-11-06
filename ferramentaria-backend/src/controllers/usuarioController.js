const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const PERFIS_VALIDOS = ['administrador', 'solicitante', 'operador'];

async function criar(req, res, next) {
  try {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({ erro: 'nome, email, senha e perfil são obrigatórios.' });
    }
    if (!PERFIS_VALIDOS.includes(perfil)) {
      return res.status(400).json({ erro: `perfil deve ser um de: ${PERFIS_VALIDOS.join(', ')}` });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuario (nome, email, senha_hash, perfil)
       VALUES ($1, $2, $3, $4)
       RETURNING id_usuario, nome, email, perfil, ativo, criado_em`,
      [nome, email, senhaHash, perfil]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id_usuario, nome, email, perfil, ativo, criado_em
       FROM usuario ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/usuarios/operadores — opções para atribuir etapas; expõe só id e nome.
async function listarOperadores(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id_usuario, nome FROM usuario
       WHERE perfil = 'operador' AND ativo = TRUE
       ORDER BY nome ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, perfil, ativo, senha } = req.body;

    if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
      return res.status(400).json({ erro: `perfil deve ser um de: ${PERFIS_VALIDOS.join(', ')}` });
    }

    const campos = [];
    const valores = [];
    let i = 1;

    if (nome !== undefined) { campos.push(`nome = $${i++}`); valores.push(nome); }
    if (perfil !== undefined) { campos.push(`perfil = $${i++}`); valores.push(perfil); }
    if (ativo !== undefined) { campos.push(`ativo = $${i++}`); valores.push(ativo); }
    if (senha) {
      const senhaHash = await bcrypt.hash(senha, 10);
      campos.push(`senha_hash = $${i++}`);
      valores.push(senhaHash);
    }

    if (campos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar foi informado.' });
    }

    valores.push(id);
    const { rows } = await pool.query(
      `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = $${i}
       RETURNING id_usuario, nome, email, perfil, ativo, criado_em`,
      valores
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function excluir(req, res, next) {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM usuario WHERE id_usuario = $1', [id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { criar, listar, listarOperadores, atualizar, excluir };
