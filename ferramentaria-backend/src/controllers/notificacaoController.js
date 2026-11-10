const pool = require('../config/db');

const LIMITE_LISTA = 50;

// GET /api/notificacoes — últimos avisos do usuário logado e quantos não foram lidos.
async function listar(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT n.id_notificacao, n.id_solicitacao, n.tipo, n.mensagem, n.lida, n.criada_em
       FROM notificacao n
       WHERE n.id_usuario = $1
       ORDER BY n.criada_em DESC, n.id_notificacao DESC
       LIMIT ${LIMITE_LISTA}`,
      [req.usuario.id]
    );
    const { rows: contagem } = await pool.query(
      'SELECT COUNT(*)::int AS nao_lidas FROM notificacao WHERE id_usuario = $1 AND lida = FALSE',
      [req.usuario.id]
    );
    res.json({ notificacoes: rows, nao_lidas: contagem[0].nao_lidas });
  } catch (err) {
    next(err);
  }
}

// GET /api/notificacoes/resumo — consulta leve feita periodicamente pelo site:
// quantos avisos não lidos existem e qual é o mais recente deles.
async function resumo(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS nao_lidas,
              (SELECT to_jsonb(ultima) FROM (
                 SELECT id_notificacao, id_solicitacao, tipo, mensagem, criada_em
                 FROM notificacao
                 WHERE id_usuario = $1 AND lida = FALSE
                 ORDER BY criada_em DESC, id_notificacao DESC
                 LIMIT 1
               ) ultima) AS mais_recente
       FROM notificacao
       WHERE id_usuario = $1 AND lida = FALSE`,
      [req.usuario.id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notificacoes/:id/lida — marca um aviso do próprio usuário como lido.
async function marcarLida(req, res, next) {
  try {
    const { rowCount } = await pool.query(
      'UPDATE notificacao SET lida = TRUE WHERE id_notificacao = $1 AND id_usuario = $2',
      [req.params.id, req.usuario.id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ erro: 'Notificação não encontrada.' });
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notificacoes/lidas — marca todos os avisos do usuário como lidos.
async function marcarTodasLidas(req, res, next) {
  try {
    await pool.query('UPDATE notificacao SET lida = TRUE WHERE id_usuario = $1 AND lida = FALSE', [req.usuario.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, resumo, marcarLida, marcarTodasLidas };
