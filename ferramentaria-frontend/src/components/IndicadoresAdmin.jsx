import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Icone from './Icone';

// Linha de indicadores do administrador no Dashboard: o que precisa de atenção
// agora e o desempenho dos últimos 30 dias (dados de GET /relatorios/indicadores).
export default function IndicadoresAdmin() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    apiRequest('/relatorios/indicadores')
      .then(setDados)
      .catch(() => setDados(null));
  }, []);

  if (!dados) return null;

  const otd = dados.otd_30_dias === null ? '—' : `${String(dados.otd_30_dias).replace('.', ',')}%`;
  const itens = [
    {
      chave: 'atraso',
      icone: 'alerta',
      valor: dados.em_atraso,
      rotulo: 'Em atraso',
      detalhe: 'abertas com prazo vencido',
      tom: dados.em_atraso > 0 ? 'ruim' : 'bom',
      para: '/solicitacoes?prazo=atrasada',
    },
    {
      chave: 'semana',
      icone: 'relogio',
      valor: dados.vencem_em_7_dias,
      rotulo: 'Vencem em 7 dias',
      detalhe: 'abertas com prazo próximo',
      tom: dados.vencem_em_7_dias > 0 ? 'atencao' : 'neutro',
      para: '/solicitacoes?prazo=semana',
    },
    {
      chave: 'sem-operador',
      icone: 'pessoa_vazia',
      valor: dados.etapas_sem_operador,
      rotulo: 'Etapas sem operador',
      detalhe: 'pendentes, ninguém atribuído',
      tom: dados.etapas_sem_operador > 0 ? 'atencao' : 'neutro',
      para: '/fila',
    },
    {
      chave: 'otd',
      icone: 'alvo',
      valor: otd,
      rotulo: 'OTD · 30 dias',
      detalhe: `${dados.no_prazo_30_dias} de ${dados.concluidas_30_dias} concluídas no prazo`,
      tom: dados.otd_30_dias === null ? 'neutro' : dados.otd_30_dias >= 80 ? 'bom' : 'atencao',
      para: '/relatorios',
    },
  ];

  return (
    <section className="indicadores-admin" aria-label="Indicadores">
      {itens.map((item) => (
        <Link key={item.chave} to={item.para} className={`indicador-admin indicador-admin--${item.tom}`}>
          <Icone nome={item.icone} className="indicador-admin__icone" />
          <span className="indicador-admin__valor">{item.valor}</span>
          <span className="indicador-admin__rotulo">{item.rotulo}</span>
          <small>{item.detalhe}</small>
        </Link>
      ))}
    </section>
  );
}
