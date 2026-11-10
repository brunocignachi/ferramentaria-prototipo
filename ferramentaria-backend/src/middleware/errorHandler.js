// Erros do PostgreSQL que chegam aqui viram mensagens compreensíveis. As
// validações dos controllers já barram a maioria antes; isto é a rede de segurança.
const ERROS_DO_BANCO = {
  '23505': [409, 'Registro duplicado.'],
  '23503': [400, 'Referência inválida: o registro relacionado não existe ou está em uso.'],
  '23502': [400, 'Um campo obrigatório não foi informado.'],
  '23514': [400, 'Um dos valores informados não é permitido.'],
  '22001': [400, 'Um dos textos é maior que o permitido.'],
  '22003': [400, 'Número muito grande para este campo.'],
  '22007': [400, 'Data em formato inválido.'],
  '22008': [400, 'Data fora do intervalo permitido.'],
  '22P02': [400, 'Valor em formato inválido.'],
};

function errorHandler(err, req, res, next) {
  // JSON malformado no corpo da requisição.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'Corpo da requisição inválido.' });
  }

  const conhecido = ERROS_DO_BANCO[err.code];
  if (conhecido) {
    const [status, erro] = conhecido;
    return res.status(status).json({ erro });
  }

  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ erro: status === 500 ? 'Erro interno do servidor.' : err.message });
}

module.exports = errorHandler;
