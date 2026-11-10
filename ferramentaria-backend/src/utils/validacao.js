// Limites dos campos, alinhados ao schema.sql e repetidos no front-end
// (ferramentaria-frontend/src/utils/validacao.js) para avisar antes de enviar.
// Cada função devolve a mensagem de erro, ou '' quando o valor é válido.

const LIMITES = {
  numeroDesenho: 50, // VARCHAR(50)
  textoLongo: 1000, // descrição e observações da solicitação
  quantidadeMaxima: 10000,
  nomeUsuario: 100, // VARCHAR(100)
  email: 150, // VARCHAR(150)
  nomeTipo: 80, // VARCHAR(80)
  descricaoTipo: 255, // VARCHAR(255)
  senhaMinima: 6,
  senhaMaxima: 72, // o bcrypt ignora o que passa de 72 bytes
};

const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;
// Aceita domínios internos sem ponto (ex.: bruno@teste), já usados no banco.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+$/;

function texto(valor, { rotulo, max, obrigatorio = false }) {
  if (valor === undefined || valor === null || String(valor).trim() === '') {
    return obrigatorio ? `${rotulo} é obrigatório.` : '';
  }
  if (typeof valor !== 'string') return `${rotulo} deve ser um texto.`;
  if (valor.length > max) return `${rotulo} pode ter no máximo ${max} caracteres (enviado: ${valor.length}).`;
  return '';
}

function quantidade(valor) {
  if (valor === undefined || valor === null || valor === '') return 'Quantidade é obrigatória.';
  const numero = Number(valor);
  if (!Number.isInteger(numero)) return 'Quantidade deve ser um número inteiro.';
  if (numero < 1) return 'Quantidade deve ser pelo menos 1.';
  if (numero > LIMITES.quantidadeMaxima) {
    return `Quantidade muito grande: o máximo é ${LIMITES.quantidadeMaxima.toLocaleString('pt-BR')} peças.`;
  }
  return '';
}

// Data no formato AAAA-MM-DD, existente no calendário e em um intervalo plausível.
function data(valor, rotulo) {
  if (!valor) return `${rotulo} é obrigatório.`;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valor));
  if (!partes) return `${rotulo} deve estar no formato AAAA-MM-DD.`;
  const [, ano, mes, dia] = partes.map(Number);
  const convertida = new Date(Date.UTC(ano, mes - 1, dia));
  if (convertida.getUTCMonth() !== mes - 1 || convertida.getUTCDate() !== dia) return `${rotulo} não é uma data válida.`;
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) return `${rotulo} deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`;
  return '';
}

function email(valor) {
  const erro = texto(valor, { rotulo: 'E-mail', max: LIMITES.email, obrigatorio: true });
  if (erro) return erro;
  return FORMATO_EMAIL.test(valor.trim()) ? '' : 'E-mail inválido. Use o formato nome@empresa.com.';
}

function senha(valor, { obrigatoria = true } = {}) {
  if (!valor) return obrigatoria ? 'Senha é obrigatória.' : '';
  if (typeof valor !== 'string') return 'Senha deve ser um texto.';
  if (valor.length < LIMITES.senhaMinima) return `A senha deve ter pelo menos ${LIMITES.senhaMinima} caracteres.`;
  if (valor.length > LIMITES.senhaMaxima) return `A senha pode ter no máximo ${LIMITES.senhaMaxima} caracteres.`;
  return '';
}

// Primeiro erro encontrado, para responder com uma mensagem só.
function primeiroErro(...erros) {
  return erros.find(Boolean) ?? '';
}

module.exports = { LIMITES, texto, quantidade, data, email, senha, primeiroErro };
