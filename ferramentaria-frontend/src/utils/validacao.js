// Mesmos limites da API (ferramentaria-backend/src/utils/validacao.js), para
// avisar enquanto a pessoa preenche. Cada função devolve a mensagem ou ''.

export const LIMITES = {
  numeroDesenho: 50,
  textoLongo: 1000,
  quantidadeMaxima: 10000,
  nomeUsuario: 100,
  email: 150,
  nomeTipo: 80,
  descricaoTipo: 255,
  senhaMinima: 6,
  senhaMaxima: 72,
};

export const DATA_MAXIMA = '2100-12-31';
const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;

export function erroTexto(valor, { rotulo, max, obrigatorio = false }) {
  const texto = String(valor ?? '');
  if (texto.trim() === '') return obrigatorio ? `${rotulo} é obrigatório.` : '';
  if (texto.length > max) return `${rotulo} muito longo: máximo de ${max} caracteres (atual: ${texto.length}).`;
  return '';
}

export function erroQuantidade(valor) {
  if (valor === '' || valor === null || valor === undefined) return 'Informe a quantidade.';
  const numero = Number(valor);
  if (!Number.isInteger(numero)) return 'A quantidade deve ser um número inteiro.';
  if (numero < 1) return 'A quantidade deve ser pelo menos 1.';
  if (numero > LIMITES.quantidadeMaxima) {
    return `Número muito grande: o máximo é ${LIMITES.quantidadeMaxima.toLocaleString('pt-BR')} peças.`;
  }
  return '';
}

export function erroData(valor, rotulo, { obrigatoria = true } = {}) {
  if (!valor) return obrigatoria ? `${rotulo} é obrigatório.` : '';
  const partes = /^(\d{4})-\d{2}-\d{2}$/.exec(valor);
  if (!partes) return `${rotulo} inválido: confira o ano.`;
  const ano = Number(partes[1]);
  if (ano < ANO_MINIMO || ano > ANO_MAXIMO) return `${rotulo} deve estar entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`;
  return '';
}

export function erroEmail(valor) {
  const erro = erroTexto(valor, { rotulo: 'E-mail', max: LIMITES.email, obrigatorio: true });
  if (erro) return erro;
  return /^[^\s@]+@[^\s@]+$/.test(valor.trim()) ? '' : 'E-mail inválido. Use o formato nome@empresa.com.';
}

export function erroSenha(valor, { obrigatoria = true } = {}) {
  if (!valor) return obrigatoria ? 'Informe a senha.' : '';
  if (valor.length < LIMITES.senhaMinima) return `A senha deve ter pelo menos ${LIMITES.senhaMinima} caracteres.`;
  if (valor.length > LIMITES.senhaMaxima) return `A senha pode ter no máximo ${LIMITES.senhaMaxima} caracteres.`;
  return '';
}
