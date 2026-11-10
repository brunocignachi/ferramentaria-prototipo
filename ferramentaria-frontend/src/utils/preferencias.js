// Preferências guardadas neste navegador (Configurações). Cada aparelho tem as
// suas; se o armazenamento não estiver disponível, valem os padrões.

const CHAVE_TEMA = 'ferramentaria_tema';
const CHAVE_AVISOS = 'ferramentaria_avisos_na_tela';
export const TEMAS = ['automatico', 'claro', 'escuro'];

function ler(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento (ex.: aba anônima): a escolha vale só até recarregar.
  }
}

const consultaEscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export function lerTema() {
  const salvo = ler(CHAVE_TEMA);
  return TEMAS.includes(salvo) ? salvo : 'automatico';
}

function aplicarTema(tema) {
  const escuro = tema === 'escuro' || (tema === 'automatico' && consultaEscuro()?.matches);
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
}

export function escolherTema(tema) {
  gravar(CHAVE_TEMA, tema);
  aplicarTema(tema);
}

// Chamado antes do React renderizar, para a página não piscar no tema errado.
// No modo automático, acompanha a troca de tema do aparelho com o site aberto.
export function iniciarTema() {
  aplicarTema(lerTema());
  consultaEscuro()?.addEventListener?.('change', () => {
    if (lerTema() === 'automatico') aplicarTema('automatico');
  });
}

export function lerAvisosNaTela() {
  return ler(CHAVE_AVISOS) !== 'nao';
}

export function escolherAvisosNaTela(ativo) {
  gravar(CHAVE_AVISOS, ativo ? 'sim' : 'nao');
}
