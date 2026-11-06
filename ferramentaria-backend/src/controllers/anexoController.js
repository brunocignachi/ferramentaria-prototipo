const fs = require('fs');
const pool = require('../config/db');
const { caminhoDoArquivo, removerArquivo, nomeOriginal } = require('../middleware/upload');

const STATUS_ATIVOS = ['aberta', 'em_andamento'];

function podeGerenciar(usuario, idSolicitante) {
  return usuario.perfil === 'administrador' || idSolicitante === usuario.id;
}

// Roda antes de receber o arquivo, para não gravar em disco um envio sem permissão.
async function validarEnvio(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id_solicitante, status FROM solicitacao WHERE id_solicitacao = $1',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Solicitação não encontrada.' });
    }
    if (!podeGerenciar(req.usuario, rows[0].id_solicitante)) {
      return res.status(403).json({ erro: 'Apenas quem criou a solicitação ou um administrador podem anexar arquivos.' });
    }
    if (!STATUS_ATIVOS.includes(rows[0].status)) {
      return res.status(400).json({ erro: `Solicitação ${rows[0].status} não aceita novos anexos.` });
    }
    next();
  } catch (err) {
    next(err);
  }
}

// POST /api/solicitacoes/:id/anexos — envia um desenho técnico (RF03, UC06, E05)
async function enviar(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Selecione um arquivo no campo "arquivo".' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO anexo (nome_arquivo, caminho, tipo_mime, tamanho_bytes, id_solicitacao, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_anexo, nome_arquivo, tipo_mime, tamanho_bytes, enviado_em, id_solicitacao, id_usuario`,
      [nomeOriginal(req.file), req.file.filename, req.file.mimetype, req.file.size, req.params.id, req.usuario.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await removerArquivo(req.file.filename);
    next(err);
  }
}

// GET /api/anexos/:id/download — quem pode ver a solicitação pode baixar os anexos dela.
async function baixar(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT a.nome_arquivo, a.caminho, s.id_solicitante
       FROM anexo a
       JOIN solicitacao s ON s.id_solicitacao = a.id_solicitacao
       WHERE a.id_anexo = $1`,
      [req.params.id]
    );
    const anexo = rows[0];
    if (!anexo) {
      return res.status(404).json({ erro: 'Anexo não encontrado.' });
    }
    if (req.usuario.perfil === 'solicitante' && anexo.id_solicitante !== req.usuario.id) {
      return res.status(403).json({ erro: 'Sem permissão para baixar este anexo.' });
    }

    const caminho = caminhoDoArquivo(anexo.caminho);
    if (!fs.existsSync(caminho)) {
      return res.status(404).json({ erro: 'O arquivo deste anexo não está mais disponível.' });
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(caminho, anexo.nome_arquivo);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/anexos/:id
async function remover(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT a.caminho, s.id_solicitante, s.status
       FROM anexo a
       JOIN solicitacao s ON s.id_solicitacao = a.id_solicitacao
       WHERE a.id_anexo = $1`,
      [req.params.id]
    );
    const anexo = rows[0];
    if (!anexo) {
      return res.status(404).json({ erro: 'Anexo não encontrado.' });
    }
    if (!podeGerenciar(req.usuario, anexo.id_solicitante)) {
      return res.status(403).json({ erro: 'Apenas quem criou a solicitação ou um administrador podem remover anexos.' });
    }
    if (!STATUS_ATIVOS.includes(anexo.status)) {
      return res.status(400).json({ erro: `Solicitação ${anexo.status} não permite remover anexos.` });
    }

    await pool.query('DELETE FROM anexo WHERE id_anexo = $1', [req.params.id]);
    await removerArquivo(anexo.caminho);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { validarEnvio, enviar, baixar, remover };
