const pool = require('../config/db');

async function listar(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tipo_processo ORDER BY nome ASC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    if (!nome) {
      return res.status(400).json({ erro: 'nome é obrigatório.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO tipo_processo (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome, descricao || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;

    const campos = [];
    const valores = [];
    let i = 1;

    if (nome !== undefined) { campos.push(`nome = $${i++}`); valores.push(nome); }
    if (descricao !== undefined) { campos.push(`descricao = $${i++}`); valores.push(descricao); }
    if (ativo !== undefined) { campos.push(`ativo = $${i++}`); valores.push(ativo); }

    if (campos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum campo para atualizar foi informado.' });
    }

    valores.push(id);
    const { rows } = await pool.query(
      `UPDATE tipo_processo SET ${campos.join(', ')} WHERE id_tipo_processo = $${i} RETURNING *`,
      valores
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Tipo de processo não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, criar, atualizar };
