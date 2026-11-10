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

// Nome principal da peça nas listas: a descrição, ou o desenho quando não há descrição.
export function tituloDaPeca(s) {
  return s.descricao?.trim() || s.numero_desenho;
}

// Situação do prazo mostrada no relatório (tela, impressão e Excel).
export function situacaoDoPrazo(s) {
  if (s.status === 'cancelada') return '—';
  if (s.status === 'concluida') return s.concluida_no_prazo ? 'No prazo' : 'Com atraso';
  return s.em_atraso ? 'Em atraso' : 'Dentro do prazo';
}

// Linha de apoio abaixo do título: o desenho, quando o título é a descrição.
export function subtituloDaPeca(s) {
  return s.descricao?.trim() ? `Desenho: ${s.numero_desenho}` : 'Sem descrição';
}

export function correspondeABusca(s, busca) {
  const termo = busca.trim().toLowerCase();
  if (!termo) return true;
  return [s.descricao, s.numero_desenho].some((campo) => campo?.toLowerCase().includes(termo));
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

// Duração em minutos para leitura: "45 min", "2 h 05 min", "3 d 4 h".
export function formatarDuracao(minutos) {
  if (minutos === null || minutos === undefined) return '—';
  const total = Math.round(Number(minutos));
  if (total < 1) return 'menos de 1 min';
  if (total < 60) return `${total} min`;
  if (total < 24 * 60) {
    const horas = Math.floor(total / 60);
    const resto = total % 60;
    return resto ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${horas} h`;
  }
  const dias = Math.floor(total / (24 * 60));
  const horas = Math.floor((total % (24 * 60)) / 60);
  return horas ? `${dias} d ${horas} h` : `${dias} d`;
}

// Minutos entre o início e a conclusão de uma etapa, ou null se ela não terminou.
export function duracaoDaEtapa(etapa) {
  if (!etapa.data_inicio || !etapa.data_conclusao) return null;
  return (new Date(etapa.data_conclusao) - new Date(etapa.data_inicio)) / 60000;
}

// Dia de hoje (ou daqui a N dias) no formato AAAA-MM-DD, no horário local.
export function diaLocal(deslocamentoDias = 0) {
  const data = new Date();
  data.setDate(data.getDate() + deslocamentoDias);
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

// Situação do prazo de uma solicitação ainda aberta, com as mesmas regras dos
// indicadores do administrador: 'atrasada', 'semana' (vence em até 7 dias) ou null.
export function prazoDaSolicitacao(s, hoje = diaLocal(), daquiUmaSemana = diaLocal(7)) {
  if (s.status !== 'aberta' && s.status !== 'em_andamento') return null;
  const prazo = dataParaInput(s.data_prazo);
  if (prazo < hoje) return 'atrasada';
  if (prazo < daquiUmaSemana) return 'semana';
  return null;
}

// Operador só atua nas etapas atribuídas a ele; administrador atua em qualquer uma.
export function podeAtuarNaEtapa(usuario, etapa) {
  return usuario?.perfil === 'administrador' || etapa.id_operador === usuario?.id;
}
