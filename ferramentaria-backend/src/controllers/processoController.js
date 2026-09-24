const pool = require('../config/db');
const { ORDER_BY_PRIORIDADE } = require('../utils/priority');

// POST /api/solicitacoes/:id/processos — administrador associa um processo
// produtivo (torno, fresa, retífica...) à solicitação (RF04)
async function adicionar(req, res, next) {
  try {
    const { id } = req.params; // id_solicitacao
    const { id_tipo_processo, ordem_execucao, id_operador, observacoes } = req.body;

    if (!id_tipo_processo || !ordem_execucao) {
      return res.status(400).json({ erro: 'id_tipo_processo e ordem_execucao são obrigatórios.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO processo_solicitacao
         (ordem_execucao, id_solicitacao, id_tipo_processo, id_operador, observacoes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ordem_execucao, id, id_tipo_processo, id_operador || null, observacoes || null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/processos/fila?id_tipo_processo=&status= — painel de tarefas
// prioritárias por máquina/processo (RF07, UC09, UC12)
async function fila(req, res, next) {
  try {
    const { id_tipo_processo, status } = req.query;
    const condicoes = [];
    const valores = [];
    let i = 1;

    if (id_tipo_processo) { condicoes.push(`p.id_tipo_processo = $${i++}`); valores.push(id_tipo_processo); }
    // Por padrão a fila mostra o que ainda precisa ser feito.
    if (status) {
      condicoes.push(`p.status = $${i++}::status_processo`);
      valores.push(status);
    } else {
      condicoes.push(`p.status IN ('pendente', 'em_andamento')`);
    }
    // Só entram na fila processos de solicitações ainda ativas.
    condicoes.push(`s.status NOT IN ('cancelada', 'concluida')`);

    const where = `WHERE ${condicoes.join(' AND ')}`;

    const { rows } = await pool.query(
      `SELECT p.*, tp.nome AS nome_tipo_processo,
              s.numero_desenho, s.prioridade, s.data_prazo, s.id_solicitacao,
              op.nome AS nome_operador
       FROM processo_solicitacao p
       JOIN tipo_processo tp ON tp.id_tipo_processo = p.id_tipo_processo
       JOIN solicitacao s ON s.id_solicitacao = p.id_solicitacao
       LEFT JOIN usuario op ON op.id_usuario = p.id_operador
       ${where}
       ${ORDER_BY_PRIORIDADE}, p.ordem_execucao ASC`,
      valores
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/processos/:id/atribuir — define o operador responsável (RN04)
async function atribuir(req, res, next) {
  try {
    const { id } = req.params;
    const { id_operador } = req.body;
    if (!id_operador) {
      return res.status(400).json({ erro: 'id_operador é obrigatório.' });
    }

    const { rows } = await pool.query(
      `UPDATE processo_solicitacao SET id_operador = $1 WHERE id_processo = $2 RETURNING *`,
      [id_operador, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/processos/:id/iniciar — operador inicia a etapa (E07)
async function iniciar(req, res, next) {
  try {
    const { id } = req.params;
    const { rows: existentes } = await pool.query(
      'SELECT * FROM processo_solicitacao WHERE id_processo = $1',
      [id]
    );
    const processo = existentes[0];
    if (!processo) {
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    if (processo.status !== 'pendente') {
      return res.status(400).json({ erro: `Processo já está com status '${processo.status}'.` });
    }
    // RN04: a etapa precisa de um operador atribuído antes de ser iniciada.
    if (!processo.id_operador) {
      return res.status(400).json({ erro: 'É necessário atribuir um operador antes de iniciar o processo.' });
    }

    const { rows } = await pool.query(
      `UPDATE processo_solicitacao
       SET status = 'em_andamento', data_inicio = NOW()
       WHERE id_processo = $1 RETURNING *`,
      [id]
    );

    await pool.query(
      `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario)
       VALUES ('processo', $1, $2, 'em_andamento', $3)`,
      [id, processo.status, req.usuario.id]
    );

    // A solicitação passa a "em_andamento" assim que sua primeira etapa começa.
    await pool.query(
      `UPDATE solicitacao SET status = 'em_andamento'
       WHERE id_solicitacao = $1 AND status = 'aberta'`,
      [processo.id_solicitacao]
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/processos/:id/concluir — operador conclui a etapa (E08, E09, RN01)
async function concluir(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { rows: existentes } = await client.query(
      'SELECT * FROM processo_solicitacao WHERE id_processo = $1 FOR UPDATE',
      [id]
    );
    const processo = existentes[0];
    if (!processo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    if (processo.status !== 'em_andamento') {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Processo precisa estar 'em_andamento' para ser concluído (status atual: '${processo.status}').` });
    }

    const { rows } = await client.query(
      `UPDATE processo_solicitacao
       SET status = 'concluido', data_conclusao = NOW()
       WHERE id_processo = $1 RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario)
       VALUES ('processo', $1, 'em_andamento', 'concluido', $2)`,
      [id, req.usuario.id]
    );

    // RN01/E09: se não sobrar nenhuma etapa pendente ou em andamento, a
    // solicitação é concluída automaticamente pelo próprio sistema.
    const { rows: pendentes } = await client.query(
      `SELECT COUNT(*) FROM processo_solicitacao
       WHERE id_solicitacao = $1 AND status IN ('pendente', 'em_andamento')`,
      [processo.id_solicitacao]
    );

    let solicitacaoConcluida = false;
    if (Number(pendentes[0].count) === 0) {
      await client.query(
        `UPDATE solicitacao SET status = 'concluida', data_conclusao = NOW()
         WHERE id_solicitacao = $1`,
        [processo.id_solicitacao]
      );
      await client.query(
        `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario, observacao)
         VALUES ('solicitacao', $1, 'em_andamento', 'concluida', $2, 'Concluída automaticamente: todas as etapas finalizadas')`,
        [processo.id_solicitacao, req.usuario.id]
      );
      solicitacaoConcluida = true;
    }

    await client.query('COMMIT');
    res.json({ ...rows[0], solicitacao_concluida: solicitacaoConcluida });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { adicionar, fila, atribuir, iniciar, concluir };
