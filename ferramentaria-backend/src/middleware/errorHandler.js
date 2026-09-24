
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({ erro: 'Registro duplicado.', detalhe: err.detail });
  }

  if (err.code === '23503') {
    return res.status(400).json({ erro: 'Referência inválida.', detalhe: err.detail });
  }

  const status = err.status || 500;
  res.status(status).json({ erro: err.message || 'Erro interno do servidor.' });
}

module.exports = errorHandler;
