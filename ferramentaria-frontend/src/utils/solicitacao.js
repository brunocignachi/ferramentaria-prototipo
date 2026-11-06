export const FORMATOS_ANEXO = '.pdf,.png,.jpg,.jpeg,.tif,.tiff,.dwg,.dxf,.step,.stp,.iges,.igs';
const TAMANHO_MAXIMO_ANEXO_MB = 20;

// Só o que o navegador sabe exibir: CAD e TIFF continuam disponíveis para download.
const TIPOS_VISUALIZAVEIS = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

function extensaoDe(nomeArquivo) {
  return nomeArquivo.split('.').pop().toLowerCase();
}

export function tipoVisualizavel(nomeArquivo) {
  return TIPOS_VISUALIZAVEIS[extensaoDe(nomeArquivo)] ?? null;
}

// Mesmas regras da API, para avisar antes de enviar. Retorna a mensagem de erro, se houver.
export function validarArquivo(arquivo) {
  if (!FORMATOS_ANEXO.split(',').includes(`.${extensaoDe(arquivo.name)}`)) {
    return `Formato não permitido: ${arquivo.name}`;
  }
  if (arquivo.size > TAMANHO_MAXIMO_ANEXO_MB * 1024 * 1024) {
    return `${arquivo.name} excede o limite de ${TAMANHO_MAXIMO_ANEXO_MB} MB.`;
  }
  return '';
}

export function formatarTamanho(bytes) {
  const valor = Number(bytes);
  if (valor < 1024 * 1024) return `${Math.max(1, Math.round(valor / 1024))} KB`;
  return `${(valor / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export const PRIORIDADE_LABEL = { urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa' };
export const PRIORIDADE_COR = { urgente: '#ef4444', alta: '#f59e0b', normal: '#2563eb', baixa: '#9ca3af' };

export const STATUS_SOLICITACAO_LABEL = {
  aberta: 'A fazer',
  em_andamento: 'Em progresso',
  concluida: 'Completo',
  cancelada: 'Cancelada',
};

export const STATUS_ETAPA_LABEL = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluída',
  cancelado: 'Cancelada',
};

// O histórico guarda status e prioridade nas mesmas colunas.
const VALOR_HISTORICO_LABEL = { ...PRIORIDADE_LABEL, ...STATUS_ETAPA_LABEL, ...STATUS_SOLICITACAO_LABEL };

export function rotuloHistorico(valor) {
  if (!valor) return '—';
  return VALOR_HISTORICO_LABEL[valor] ?? valor;
}

// Prazo é uma data sem horário: lê direto do ISO para o fuso não mudar o dia.
export function dataParaInput(valor) {
  return valor ? String(valor).slice(0, 10) : '';
}

export function formatarPrazo(valor) {
  return valor ? dataParaInput(valor).split('-').reverse().join('/') : '—';
}

export function formatarData(valor) {
  return valor ? new Date(valor).toLocaleDateString('pt-BR') : '—';
}

export function formatarDataHora(valor) {
  return valor
    ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

// Operador só atua nas etapas atribuídas a ele; administrador atua em qualquer uma.
export function podeAtuarNaEtapa(usuario, etapa) {
  return usuario?.perfil === 'administrador' || etapa.id_operador === usuario?.id;
}
