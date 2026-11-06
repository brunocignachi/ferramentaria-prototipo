const pool = require('../config/db');
const { ORDER_BY_PRIORIDADE } = require('../utils/priority');

// O roteiro de cada solicitação é próprio: as etapas são linhas de
// processo_solicitacao ordenadas por ordem_execucao, e o mesmo tipo de processo
// pode se repetir (ex.: torno → fresa → torno). Cada etapa só pode começar
// depois que todas as anteriores forem concluídas (RF04, E08).

const STATUS_SOLICITACAO_ENCERRADA = ['cancelada', 'concluida'];

// Trava a solicitação e depois a etapa, sempre nessa ordem, para não haver
// deadlock com o cancelamento (solicitacaoController.cancelar) e para impedir
// que uma etapa avance enquanto a solicitação está sendo cancelada.
async function travarProcesso(client, idProcesso) {
  const { rows: encontrados } = await client.query(
    'SELECT id_solicitacao FROM processo_solicitacao WHERE id_processo = $1',
    [idProcesso]
  );
  if (encontrados.length === 0) return null;

  const { rows: solicitacoes } = await client.query(
    'SELECT * FROM solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
    [encontrados[0].id_solicitacao]
  );
  const { rows: processos } = await client.query(
    'SELECT * FROM processo_solicitacao WHERE id_processo = $1 FOR UPDATE',
    [idProcesso]
  );

  return { processo: processos[0], solicitacao: solicitacoes[0] };
}

// Trava a solicitação e valida se o usuário pode mudar o roteiro dela: quem a
// criou ou um administrador, enquanto ela estiver ativa.
// Retorna { status, erro } quando não puder prosseguir.
async function travarSolicitacaoParaRoteiro(client, idSolicitacao, usuario) {
  const { rows } = await client.query(
    'SELECT * FROM solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
    [idSolicitacao]
  );
  if (rows.length === 0) {
    return { status: 404, erro: 'Solicitação não encontrada.' };
  }
  if (usuario.perfil !== 'administrador' && rows[0].id_solicitante !== usuario.id) {
    return { status: 403, erro: 'Apenas quem criou a solicitação ou um administrador podem alterar o roteiro.' };
  }
  if (STATUS_SOLICITACAO_ENCERRADA.includes(rows[0].status)) {
    return { status: 400, erro: `Solicitação ${rows[0].status} não aceita alterações nos processos.` };
  }
  return {};
}

// Só um usuário ativo com perfil de operador pode ser responsável por uma etapa (RN04).
async function operadorValido(client, idOperador) {
  const { rows } = await client.query(
    `SELECT 1 FROM usuario WHERE id_usuario = $1 AND perfil = 'operador' AND ativo = TRUE`,
    [idOperador]
  );
  return rows.length > 0;
}

// Operador só atua nas etapas atribuídas a ele; administrador atua em qualquer uma.
function podeAtuarNaEtapa(usuario, processo) {
  return usuario.perfil === 'administrador' || processo.id_operador === usuario.id;
}

// POST /api/solicitacoes/:id/processos — quem criou a solicitação ou um
// administrador adiciona uma etapa ao roteiro (RF04). Sem ordem_execucao, a
// etapa entra no fim.
async function adicionar(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params; // id_solicitacao
    const { id_tipo_processo, ordem_execucao, id_operador, observacoes } = req.body;

    if (!id_tipo_processo) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'id_tipo_processo é obrigatório.' });
    }
    if (ordem_execucao !== undefined && (!Number.isInteger(ordem_execucao) || ordem_execucao < 1)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'ordem_execucao deve ser um inteiro maior que zero.' });
    }

    const bloqueio = await travarSolicitacaoParaRoteiro(client, id, req.usuario);
    if (bloqueio.erro) {
      await client.query('ROLLBACK');
      return res.status(bloqueio.status).json({ erro: bloqueio.erro });
    }

    if (id_operador && !(await operadorValido(client, id_operador))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'id_operador deve ser um usuário ativo com perfil de operador.' });
    }

    const { rows: etapas } = await client.query(
      'SELECT ordem_execucao, status FROM processo_solicitacao WHERE id_solicitacao = $1',
      [id]
    );

    let ordem = ordem_execucao;
    if (ordem === undefined) {
      ordem = etapas.reduce((maior, etapa) => Math.max(maior, etapa.ordem_execucao), 0) + 1;
    } else {
      if (etapas.some((etapa) => etapa.ordem_execucao === ordem)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ erro: `Já existe uma etapa na posição ${ordem} desta solicitação.` });
      }
      const ultimaIniciada = etapas
        .filter((etapa) => etapa.status !== 'pendente')
        .reduce((maior, etapa) => Math.max(maior, etapa.ordem_execucao), 0);
      if (ordem <= ultimaIniciada) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: `A nova etapa deve vir depois da posição ${ultimaIniciada}, a última já iniciada.` });
      }
    }

    const { rows } = await client.query(
      `INSERT INTO processo_solicitacao
         (ordem_execucao, id_solicitacao, id_tipo_processo, id_operador, observacoes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ordem, id, id_tipo_processo, id_operador || null, observacoes || null]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PUT /api/solicitacoes/:id/processos/ordem — quem criou a solicitação ou um
// administrador muda a sequência das etapas que ainda não começaram. Corpo:
// { "processos": [id, id, ...] }, com todas as etapas pendentes na nova ordem.
// Etapas já iniciadas não mudam.
async function reordenar(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params; // id_solicitacao
    const { processos } = req.body;

    if (!Array.isArray(processos) || processos.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'processos deve ser uma lista com os ids das etapas pendentes.' });
    }

    const bloqueio = await travarSolicitacaoParaRoteiro(client, id, req.usuario);
    if (bloqueio.erro) {
      await client.query('ROLLBACK');
      return res.status(bloqueio.status).json({ erro: bloqueio.erro });
    }

    const { rows: etapas } = await client.query(
      'SELECT id_processo, ordem_execucao, status FROM processo_solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
      [id]
    );

    const pendentes = etapas.filter((etapa) => etapa.status === 'pendente').map((etapa) => etapa.id_processo);
    const informados = new Set(processos.map(Number));
    const listaConfere =
      processos.length === pendentes.length &&
      informados.size === pendentes.length &&
      pendentes.every((idProcesso) => informados.has(idProcesso));

    if (!listaConfere) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'A lista deve conter exatamente as etapas pendentes da solicitação, sem repetição.' });
    }

    const ultimaIniciada = etapas
      .filter((etapa) => etapa.status !== 'pendente')
      .reduce((maior, etapa) => Math.max(maior, etapa.ordem_execucao), 0);

    for (const [indice, idProcesso] of processos.entries()) {
      await client.query(
        'UPDATE processo_solicitacao SET ordem_execucao = $1 WHERE id_processo = $2',
        [ultimaIniciada + indice + 1, idProcesso]
      );
    }

    const { rows } = await client.query(
      'SELECT * FROM processo_solicitacao WHERE id_solicitacao = $1 ORDER BY ordem_execucao ASC',
      [id]
    );

    await client.query('COMMIT');
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
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
    // Etapa pendente só aparece quando chega a vez dela no roteiro da peça.
    if (!status || status === 'pendente') {
      condicoes.push(`NOT EXISTS (
        SELECT 1 FROM processo_solicitacao anterior
        WHERE anterior.id_solicitacao = p.id_solicitacao
          AND anterior.ordem_execucao < p.ordem_execucao
          AND anterior.status IN ('pendente', 'em_andamento')
      )`);
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

// PATCH /api/processos/:id/atribuir — define o operador responsável por uma etapa
// que ainda não começou (RN04). Permitido a quem criou a solicitação ou a um administrador.
async function atribuir(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { id_operador } = req.body;
    if (!id_operador) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'id_operador é obrigatório.' });
    }

    const travados = await travarProcesso(client, id);
    if (!travados) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    const { processo, solicitacao } = travados;

    if (req.usuario.perfil !== 'administrador' && solicitacao.id_solicitante !== req.usuario.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Apenas quem criou a solicitação ou um administrador podem atribuir operadores.' });
    }
    if (STATUS_SOLICITACAO_ENCERRADA.includes(solicitacao.status) || processo.status !== 'pendente') {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'Só é possível atribuir operador a uma etapa pendente de solicitação ativa.' });
    }
    if (!(await operadorValido(client, id_operador))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'id_operador deve ser um usuário ativo com perfil de operador.' });
    }

    const { rows } = await client.query(
      `UPDATE processo_solicitacao SET id_operador = $1 WHERE id_processo = $2 RETURNING *`,
      [id_operador, id]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /api/processos/:id/iniciar — operador inicia a etapa (E07)
async function iniciar(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const travados = await travarProcesso(client, id);
    if (!travados) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    const { processo, solicitacao } = travados;

    if (STATUS_SOLICITACAO_ENCERRADA.includes(solicitacao.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Solicitação ${solicitacao.status} não permite iniciar etapas.` });
    }
    if (processo.status !== 'pendente') {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Processo já está com status '${processo.status}'.` });
    }
    // RN04: a etapa precisa de um operador atribuído antes de ser iniciada.
    if (!processo.id_operador) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'É necessário atribuir um operador antes de iniciar o processo.' });
    }
    if (!podeAtuarNaEtapa(req.usuario, processo)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Esta etapa está atribuída a outro operador.' });
    }

    // RF04/E08: as etapas seguem a sequência definida no roteiro da solicitação.
    const { rows: anteriores } = await client.query(
      `SELECT p.ordem_execucao, tp.nome
       FROM processo_solicitacao p
       JOIN tipo_processo tp ON tp.id_tipo_processo = p.id_tipo_processo
       WHERE p.id_solicitacao = $1
         AND p.ordem_execucao < $2
         AND p.status IN ('pendente', 'em_andamento')
       ORDER BY p.ordem_execucao ASC
       LIMIT 1`,
      [processo.id_solicitacao, processo.ordem_execucao]
    );
    if (anteriores.length > 0) {
      const { ordem_execucao: ordem, nome } = anteriores[0];
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Conclua antes a etapa ${ordem} (${nome}).` });
    }

    const { rows } = await client.query(
      `UPDATE processo_solicitacao
       SET status = 'em_andamento', data_inicio = NOW()
       WHERE id_processo = $1 RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario)
       VALUES ('processo', $1, $2, 'em_andamento', $3)`,
      [id, processo.status, req.usuario.id]
    );

    // A solicitação passa a "em_andamento" assim que sua primeira etapa começa.
    if (solicitacao.status === 'aberta') {
      await client.query(
        `UPDATE solicitacao SET status = 'em_andamento' WHERE id_solicitacao = $1`,
        [processo.id_solicitacao]
      );
      await client.query(
        `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario, observacao)
         VALUES ('solicitacao', $1, 'aberta', 'em_andamento', $2, 'Primeira etapa iniciada')`,
        [processo.id_solicitacao, req.usuario.id]
      );
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// PATCH /api/processos/:id/concluir — operador conclui a etapa (E08, E09, RN01)
async function concluir(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const travados = await travarProcesso(client, id);
    if (!travados) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Processo não encontrado.' });
    }
    const { processo, solicitacao } = travados;

    // Impede que uma solicitação cancelada volte a aparecer como concluída.
    if (STATUS_SOLICITACAO_ENCERRADA.includes(solicitacao.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Solicitação ${solicitacao.status} não permite concluir etapas.` });
    }
    if (!podeAtuarNaEtapa(req.usuario, processo)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Esta etapa está atribuída a outro operador.' });
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
         VALUES ('solicitacao', $1, $2, 'concluida', $3, 'Concluída automaticamente: todas as etapas finalizadas')`,
        [processo.id_solicitacao, solicitacao.status, req.usuario.id]
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

module.exports = { adicionar, reordenar, fila, atribuir, iniciar, concluir, operadorValido };
