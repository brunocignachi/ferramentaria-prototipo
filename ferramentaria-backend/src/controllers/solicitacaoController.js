const pool = require('../config/db');
const { ORDER_BY_LISTA } = require('../utils/priority');
const { removerArquivo } = require('../middleware/upload');
const { operadorValido } = require('./processoController');

const validar = require('../utils/validacao');

const PRIORIDADES_VALIDAS = ['urgente', 'alta', 'normal', 'baixa'];
const MAXIMO_ETAPAS = 50;

// Valida os campos informados. Na criação, os obrigatórios precisam vir; na
// edição, só o que foi enviado é conferido.
function validarCampos(campos, criando) {
  const { LIMITES } = validar;
  const informado = (campo) => criando || campos[campo] !== undefined;
  return validar.primeiroErro(
    informado('numero_desenho') &&
      validar.texto(campos.numero_desenho, { rotulo: 'Número do desenho', max: LIMITES.numeroDesenho, obrigatorio: true }),
    informado('quantidade') && validar.quantidade(campos.quantidade),
    informado('data_prazo') && validar.data(campos.data_prazo, 'Prazo'),
    validar.texto(campos.descricao, { rotulo: 'Descrição', max: LIMITES.textoLongo }),
    validar.texto(campos.observacoes, { rotulo: 'Observações', max: LIMITES.textoLongo })
  );
}

// POST /api/solicitacoes — solicitante ou administrador (RF01). Pode receber o
// roteiro em "processos", na ordem de execução: a solicitação e as etapas são
// gravadas juntas, para nunca ficar um roteiro pela metade (RF04).
async function criar(req, res, next) {
  const client = await pool.connect();
  try {
    const { numero_desenho, descricao, quantidade, prioridade, data_prazo, observacoes, processos = [] } = req.body;

    const invalido = validarCampos({ numero_desenho, descricao, quantidade, data_prazo, observacoes }, true);
    if (invalido) {
      return res.status(400).json({ erro: invalido });
    }
    if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      return res.status(400).json({ erro: `prioridade deve ser um de: ${PRIORIDADES_VALIDAS.join(', ')}` });
    }
    if (!Array.isArray(processos) || processos.some((etapa) => !etapa?.id_tipo_processo)) {
      return res.status(400).json({ erro: 'processos deve ser uma lista de etapas com id_tipo_processo.' });
    }
    if (processos.length > MAXIMO_ETAPAS) {
      return res.status(400).json({ erro: `O roteiro pode ter no máximo ${MAXIMO_ETAPAS} etapas.` });
    }

    // Solicitante é sempre o usuário autenticado, a menos que um administrador
    // esteja cadastrando em nome de outro solicitante (id_solicitante no corpo).
    const idSolicitante = req.usuario.perfil === 'administrador' && req.body.id_solicitante
      ? req.body.id_solicitante
      : req.usuario.id;

    await client.query('BEGIN');

    for (const etapa of processos) {
      const { rows: tipos } = await client.query(
        'SELECT 1 FROM tipo_processo WHERE id_tipo_processo = $1 AND ativo = TRUE',
        [etapa.id_tipo_processo]
      );
      if (tipos.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: 'O roteiro contém um tipo de processo inexistente ou inativo.' });
      }
      if (etapa.id_operador && !(await operadorValido(client, etapa.id_operador))) {
        await client.query('ROLLBACK');
        return res.status(400).json({ erro: 'id_operador deve ser um usuário ativo com perfil de operador.' });
      }
    }

    const { rows } = await client.query(
      `INSERT INTO solicitacao
         (numero_desenho, descricao, quantidade, prioridade, data_prazo, observacoes, id_solicitante)
       VALUES ($1, $2, $3, $4::prioridade_solicitacao, $5, $6, $7)
       RETURNING *`,
      [
        numero_desenho.trim(),
        descricao?.trim() || null,
        Number(quantidade),
        prioridade || 'normal',
        data_prazo,
        observacoes?.trim() || null,
        idSolicitante,
      ]
    );

    const etapasCriadas = [];
    for (const [indice, etapa] of processos.entries()) {
      const { rows: criada } = await client.query(
        `INSERT INTO processo_solicitacao (ordem_execucao, id_solicitacao, id_tipo_processo, id_operador)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [indice + 1, rows[0].id_solicitacao, etapa.id_tipo_processo, etapa.id_operador || null]
      );
      etapasCriadas.push(criada[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...rows[0], processos: etapasCriadas });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

// GET /api/solicitacoes — lista com filtros opcionais, já ordenada por prioridade (RF06)
async function listar(req, res, next) {
  try {
    const { status, prioridade, id_solicitante } = req.query;
    const condicoes = [];
    const valores = [];
    let i = 1;

    if (status) { condicoes.push(`s.status = $${i++}::status_solicitacao`); valores.push(status); }
if (prioridade) { condicoes.push(`s.prioridade = $${i++}::prioridade_solicitacao`); valores.push(prioridade); }
    if (id_solicitante) { condicoes.push(`s.id_solicitante = $${i++}`); valores.push(id_solicitante); }

    // Um solicitante só enxerga as próprias solicitações; admin e operador veem todas.
    if (req.usuario.perfil === 'solicitante') {
      condicoes.push(`s.id_solicitante = $${i++}`);
      valores.push(req.usuario.id);
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT s.*, u.nome AS nome_solicitante
       FROM solicitacao s
       JOIN usuario u ON u.id_usuario = s.id_solicitante
       ${where}
       ${ORDER_BY_LISTA}`,
      valores
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/solicitacoes/:id — detalhe com processos e histórico (RF08, UC11/UC14)
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT s.*, u.nome AS nome_solicitante
       FROM solicitacao s
       JOIN usuario u ON u.id_usuario = s.id_solicitante
       WHERE s.id_solicitacao = $1`,
      [id]
    );
    const solicitacao = rows[0];
    if (!solicitacao) {
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }

    if (req.usuario.perfil === 'solicitante' && solicitacao.id_solicitante !== req.usuario.id) {
      return res.status(403).json({ erro: 'Sem permissão para visualizar esta solicitação.' });
    }

    const processos = await pool.query(
      `SELECT p.*, tp.nome AS nome_tipo_processo, op.nome AS nome_operador
       FROM processo_solicitacao p
       JOIN tipo_processo tp ON tp.id_tipo_processo = p.id_tipo_processo
       LEFT JOIN usuario op ON op.id_usuario = p.id_operador
       WHERE p.id_solicitacao = $1
       ORDER BY p.ordem_execucao ASC`,
      [id]
    );

    // Histórico completo da peça: mudanças da solicitação e de cada etapa (RF08, H2).
    const historico = await pool.query(
      `SELECT h.*, u.nome AS nome_usuario, p.ordem_execucao, tp.nome AS nome_tipo_processo
       FROM historico_status h
       LEFT JOIN usuario u ON u.id_usuario = h.id_usuario
       LEFT JOIN processo_solicitacao p
         ON h.entidade = 'processo' AND p.id_processo = h.id_entidade
       LEFT JOIN tipo_processo tp ON tp.id_tipo_processo = p.id_tipo_processo
       WHERE (h.entidade = 'solicitacao' AND h.id_entidade = $1)
          OR (h.entidade = 'processo' AND p.id_solicitacao = $1)
       ORDER BY h.alterado_em ASC, h.id_historico ASC`,
      [id]
    );

    const anexos = await pool.query(
      `SELECT a.id_anexo, a.nome_arquivo, a.tipo_mime, a.tamanho_bytes, a.enviado_em, u.nome AS nome_usuario
       FROM anexo a
       LEFT JOIN usuario u ON u.id_usuario = a.id_usuario
       WHERE a.id_solicitacao = $1
       ORDER BY a.enviado_em ASC, a.id_anexo ASC`,
      [id]
    );

    res.json({ ...solicitacao, processos: processos.rows, historico: historico.rows, anexos: anexos.rows });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/solicitacoes/:id — edição, incluindo troca de prioridade (RF02, UC05)
async function atualizar(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { rows: existentes } = await client.query(
      'SELECT * FROM solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
      [id]
    );
    const atual = existentes[0];
    if (!atual) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }

    const ehDona = atual.id_solicitante === req.usuario.id;
    const ehAdmin = req.usuario.perfil === 'administrador';
    if (!ehDona && !ehAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Apenas o solicitante ou um administrador podem editar.' });
    }
    if (atual.status === 'cancelada' || atual.status === 'concluida') {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Solicitação ${atual.status} não pode ser editada.` });
    }

    const { numero_desenho, descricao, quantidade, prioridade, data_prazo, observacoes } = req.body;
    if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `prioridade deve ser um de: ${PRIORIDADES_VALIDAS.join(', ')}` });
    }
    const invalido = validarCampos({ numero_desenho, descricao, quantidade, data_prazo, observacoes }, false);
    if (invalido) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: invalido });
    }

    const campos = [];
    const valores = [];
    let i = 1;
    if (numero_desenho !== undefined) { campos.push(`numero_desenho = $${i++}`); valores.push(numero_desenho.trim()); }
    if (descricao !== undefined) { campos.push(`descricao = $${i++}`); valores.push(descricao?.trim() || null); }
    if (quantidade !== undefined) { campos.push(`quantidade = $${i++}`); valores.push(Number(quantidade)); }
    if (prioridade !== undefined) { campos.push(`prioridade = $${i++}::prioridade_solicitacao`); valores.push(prioridade); }
    if (data_prazo !== undefined) { campos.push(`data_prazo = $${i++}`); valores.push(data_prazo); }
    if (observacoes !== undefined) { campos.push(`observacoes = $${i++}`); valores.push(observacoes?.trim() || null); }

    if (campos.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: 'Nenhum campo para atualizar foi informado.' });
    }

    valores.push(id);
    const { rows } = await client.query(
      `UPDATE solicitacao SET ${campos.join(', ')} WHERE id_solicitacao = $${i} RETURNING *`,
      valores
    );

    // Registra histórico apenas quando a edição inclui mudança de prioridade,
    // já que é o campo com regra de negócio de reordenação automática (E04).
    if (prioridade !== undefined && prioridade !== atual.prioridade) {
      await client.query(
        `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario, observacao)
         VALUES ('solicitacao', $1, $2, $3, $4, 'Alteração de prioridade')`,
        [id, atual.prioridade, prioridade, req.usuario.id]
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

// DELETE /api/solicitacoes/:id — cancelamento lógico (RF02, E03), não exclusão física
async function cancelar(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { rows: existentes } = await client.query(
      'SELECT * FROM solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
      [id]
    );
    const atual = existentes[0];
    if (!atual) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }

    const ehDona = atual.id_solicitante === req.usuario.id;
    const ehAdmin = req.usuario.perfil === 'administrador';
    if (!ehDona && !ehAdmin) {
      await client.query('ROLLBACK');
      return res.status(403).json({ erro: 'Apenas o solicitante ou um administrador podem cancelar.' });
    }
    if (atual.status === 'concluida' || atual.status === 'cancelada') {
      await client.query('ROLLBACK');
      return res.status(400).json({ erro: `Solicitação já está ${atual.status}.` });
    }

    const { rows } = await client.query(
      `UPDATE solicitacao SET status = 'cancelada' WHERE id_solicitacao = $1 RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario)
       VALUES ('solicitacao', $1, $2, 'cancelada', $3)`,
      [id, atual.status, req.usuario.id]
    );

    // As etapas ainda abertas são canceladas junto, com registro no histórico.
    await client.query(
      `INSERT INTO historico_status (entidade, id_entidade, status_anterior, status_novo, id_usuario, observacao)
       SELECT 'processo'::entidade_historico, id_processo, status::varchar, 'cancelado', $2, 'Cancelado junto com a solicitação'
       FROM processo_solicitacao
       WHERE id_solicitacao = $1 AND status IN ('pendente', 'em_andamento')`,
      [id, req.usuario.id]
    );
    await client.query(
      `UPDATE processo_solicitacao SET status = 'cancelado'
       WHERE id_solicitacao = $1 AND status IN ('pendente', 'em_andamento')`,
      [id]
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

// DELETE /api/solicitacoes/:id/permanente — exclusão física, só para administrador (RN03).
// Apaga também etapas, histórico e anexos, sem possibilidade de recuperação.
async function excluirPermanente(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { rows: existentes } = await client.query(
      'SELECT id_solicitacao FROM solicitacao WHERE id_solicitacao = $1 FOR UPDATE',
      [id]
    );
    if (existentes.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }

    const { rows: anexos } = await client.query('SELECT caminho FROM anexo WHERE id_solicitacao = $1', [id]);

    // historico_status não tem chave estrangeira (a entidade é polimórfica) e precisa ser limpo à parte.
    await client.query(
      `DELETE FROM historico_status
       WHERE (entidade = 'solicitacao' AND id_entidade = $1)
          OR (entidade = 'processo' AND id_entidade IN (
                SELECT id_processo FROM processo_solicitacao WHERE id_solicitacao = $1))`,
      [id]
    );
    await client.query('DELETE FROM solicitacao WHERE id_solicitacao = $1', [id]);

    await client.query('COMMIT');

    // Só apaga os arquivos depois de confirmar a exclusão no banco.
    await Promise.all(anexos.map((anexo) => removerArquivo(anexo.caminho)));
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

module.exports = { criar, listar, buscarPorId, atualizar, cancelar, excluirPermanente };
