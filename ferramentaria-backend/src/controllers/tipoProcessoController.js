const pool = require('../config/db');
const validar = require('../utils/validacao');

function validarCampos({ nome, descricao }, criando) {
  return validar.primeiroErro(
    (criando || nome !== undefined) &&
      validar.texto(nome, { rotulo: 'Nome', max: validar.LIMITES.nomeTipo, obrigatorio: true }),
    validar.texto(descricao, { rotulo: 'Descrição', max: validar.LIMITES.descricaoTipo })
  );
}

// Dois tipos com o mesmo nome confundiriam quem monta o roteiro.
async function nomeEmUso(nome, idIgnorado = null) {
  const { rows } = await pool.query(
    `SELECT 1 FROM tipo_processo
     WHERE LOWER(nome) = LOWER($1) AND ($2::int IS NULL OR id_tipo_processo <> $2)`,
    [nome.trim(), idIgnorado]
  );
  return rows.length > 0;
}

async function listar(req, res, next) {
  try {
    // em_uso indica se o tipo já aparece em algum roteiro (aí só pode ser desativado).
    const { rows } = await pool.query(
      `SELECT t.*, EXISTS (
         SELECT 1 FROM processo_solicitacao p WHERE p.id_tipo_processo = t.id_tipo_processo
       ) AS em_uso
       FROM tipo_processo t
       ORDER BY t.nome ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function criar(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    const invalido = validarCampos({ nome, descricao }, true);
    if (invalido) {
      return res.status(400).json({ erro: invalido });
    }
    if (await nomeEmUso(nome)) {
      return res.status(409).json({ erro: `Já existe um tipo de processo chamado "${nome.trim()}".` });
    }
    const { rows } = await pool.query(
      `INSERT INTO tipo_processo (nome, descricao) VALUES ($1, $2) RETURNING *`,
      [nome.trim(), descricao?.trim() || null]
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

    const invalido = validar.primeiroErro(
      validarCampos({ nome, descricao }, false),
      ativo !== undefined && typeof ativo !== 'boolean' && 'ativo deve ser verdadeiro ou falso.'
    );
    if (invalido) {
      return res.status(400).json({ erro: invalido });
    }
    if (nome !== undefined && (await nomeEmUso(nome, Number(id)))) {
      return res.status(409).json({ erro: `Já existe um tipo de processo chamado "${nome.trim()}".` });
    }

    const campos = [];
    const valores = [];
    let i = 1;

    if (nome !== undefined) { campos.push(`nome = $${i++}`); valores.push(nome.trim()); }
    if (descricao !== undefined) { campos.push(`descricao = $${i++}`); valores.push(descricao?.trim() || null); }
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

// DELETE /api/tipos-processo/:id — exclusão física, só para tipos que nunca
// entraram em um roteiro. Os já usados ficam no histórico das peças e só podem
// ser desativados.
async function excluir(req, res, next) {
  try {
    const { rowCount } = await pool.query('DELETE FROM tipo_processo WHERE id_tipo_processo = $1', [req.params.id]);
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Tipo de processo não encontrado.' });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        erro: 'Este tipo de processo já foi usado em roteiros e não pode ser excluído. Desative-o para que não apareça em novos roteiros.',
      });
    }
    next(err);
  }
}

module.exports = { listar, criar, atualizar, excluir };
