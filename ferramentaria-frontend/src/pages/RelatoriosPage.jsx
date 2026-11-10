import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import {
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  formatarData,
  formatarDataHora,
  formatarDuracao,
  formatarPrazo,
  situacaoDoPrazo,
  tituloDaPeca,
} from '../utils/solicitacao';
import { baixarRelatorioExcel } from '../utils/relatorioExcel';
import { DATA_MAXIMA, erroData } from '../utils/validacao';
import { useValidacao } from '../hooks/useValidacao';
import CampoErro from '../components/CampoErro';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const FILTROS_INICIAIS = { data_inicio: '', data_fim: '', status: '', id_operador: '' };

// Relatório de solicitações por período, status e operador, com o indicador
// On-Time Delivery das peças concluídas (RF09, UC13, E10).
export default function RelatoriosPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [operadores, setOperadores] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Filtros usados no relatório exibido, para o cabeçalho da impressão.
  const [filtrosGerados, setFiltrosGerados] = useState(FILTROS_INICIAIS);
  const [geradoEm, setGeradoEm] = useState(null);
  const [exportando, setExportando] = useState(false);

  // A planilha traz exatamente o relatório exibido, com os mesmos filtros.
  async function exportarExcel() {
    setExportando(true);
    setErro('');
    try {
      await baixarRelatorioExcel({ relatorio, filtros: descreverFiltros(filtrosGerados), geradoEm });
    } catch {
      setErro('Não foi possível gerar a planilha. Tente novamente.');
    } finally {
      setExportando(false);
    }
  }

  const alterar = (campo, valor) => setFiltros((atuais) => ({ ...atuais, [campo]: valor }));

  const erros = {
    data_inicio: erroData(filtros.data_inicio, 'Data inicial', { obrigatoria: false }),
    data_fim:
      erroData(filtros.data_fim, 'Data final', { obrigatoria: false }) ||
      (filtros.data_inicio && filtros.data_fim && filtros.data_fim < filtros.data_inicio
        ? 'A data final deve ser igual ou posterior à inicial.'
        : ''),
  };
  const { erroDe, podeEnviar } = useValidacao(erros, filtros);

  function descreverFiltros(criterios) {
    const partes = [];
    if (criterios.data_inicio || criterios.data_fim) {
      partes.push(
        `Abertura: ${criterios.data_inicio ? formatarPrazo(criterios.data_inicio) : 'início'} a ${
          criterios.data_fim ? formatarPrazo(criterios.data_fim) : 'hoje'
        }`
      );
    }
    if (criterios.status) partes.push(`Status: ${STATUS_SOLICITACAO_LABEL[criterios.status]}`);
    if (criterios.id_operador) {
      const operador = operadores.find((op) => op.id_usuario === Number(criterios.id_operador));
      partes.push(`Operador: ${operador?.nome ?? criterios.id_operador}`);
    }
    return partes.length ? partes.join(' · ') : 'Sem filtros: todas as solicitações';
  }

  async function gerar(criterios) {
    setCarregando(true);
    setErro('');
    try {
      const parametros = new URLSearchParams(Object.entries(criterios).filter(([, valor]) => valor));
      const consulta = parametros.toString();
      setRelatorio(await apiRequest(`/relatorios/solicitacoes${consulta ? `?${consulta}` : ''}`));
      setFiltrosGerados(criterios);
      setGeradoEm(new Date());
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    apiRequest('/usuarios/operadores')
      .then(setOperadores)
      .catch((err) => setErro(err.message));
  }, []);

  const resumo = relatorio?.resumo;

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header className="detalhe__cabecalho">
          <div>
            <h1 className="page-title">Relatórios</h1>
            <p className="page-subtitle">Solicitações por data de abertura, status e operador.</p>
          </div>
          {relatorio && (
            <div className="detalhe__acoes nao-imprimir">
              <button type="button" className="btn btn--primario" disabled={exportando} onClick={exportarExcel}>
                {exportando ? 'Gerando planilha...' : 'Baixar Excel'}
              </button>
              <button type="button" className="btn" onClick={() => window.print()}>
                Imprimir
              </button>
            </div>
          )}
        </header>

        <form
          className="card nao-imprimir"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (podeEnviar()) gerar(filtros);
          }}
        >
          <div className="form-campos">
            <label>
              Abertura a partir de
              <input
                type="date"
                max={DATA_MAXIMA}
                value={filtros.data_inicio}
                aria-invalid={!!erroDe('data_inicio')}
                onChange={(e) => alterar('data_inicio', e.target.value)}
              />
              <CampoErro mensagem={erroDe('data_inicio')} />
            </label>
            <label>
              Abertura até
              <input
                type="date"
                max={DATA_MAXIMA}
                value={filtros.data_fim}
                aria-invalid={!!erroDe('data_fim')}
                onChange={(e) => alterar('data_fim', e.target.value)}
              />
              <CampoErro mensagem={erroDe('data_fim')} />
            </label>
            <label>
              Status
              <select value={filtros.status} onChange={(e) => alterar('status', e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(STATUS_SOLICITACAO_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Operador
              <select value={filtros.id_operador} onChange={(e) => alterar('id_operador', e.target.value)}>
                <option value="">Todos</option>
                {operadores.map((op) => (
                  <option key={op.id_usuario} value={op.id_usuario}>
                    {op.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-acoes">
            <button type="submit" className="btn btn--primario" disabled={carregando}>
              {carregando ? 'Gerando...' : 'Gerar relatório'}
            </button>
          </div>
        </form>

        {erro && <p className="dashboard__error">{erro}</p>}

        {relatorio && (
          <>
            <p className="so-impressao relatorio__filtros">
              {descreverFiltros(filtrosGerados)} · Gerado em {formatarDataHora(geradoEm)}
            </p>

            <dl className="indicadores">
              <div className="indicador">
                <dt>Solicitações</dt>
                <dd>{resumo.total}</dd>
              </div>
              <div className="indicador">
                <dt>Concluídas</dt>
                <dd>{resumo.concluidas}</dd>
                <small>
                  {resumo.concluidas_no_prazo} no prazo · {resumo.concluidas_com_atraso} com atraso
                </small>
              </div>
              <div className="indicador">
                <dt>Abertas em atraso</dt>
                <dd>{resumo.em_atraso}</dd>
              </div>
              <div className="indicador">
                <dt>On-Time Delivery</dt>
                <dd>{resumo.otd_percentual === null ? '—' : `${String(resumo.otd_percentual).replace('.', ',')}%`}</dd>
                <small>Concluídas dentro do prazo</small>
              </div>
            </dl>

            <section className="card">
              <h2>Tempo por processo</h2>
              <p className="card__nota">
                Do "Iniciar" ao "Concluir" das etapas concluídas destas solicitações. É tempo corrido: inclui pausas,
                noites e fins de semana.
              </p>
              {relatorio.tempos_por_processo.length === 0 ? (
                <p className="card__empty">Nenhuma etapa concluída com estes filtros.</p>
              ) : (
                <div className="tabela-rolagem">
                  <table className="tabela tabela--tempos">
                    <thead>
                      <tr>
                        <th className="col-quebra">Processo</th>
                        <th className="col-fixa num">Etapas</th>
                        <th className="col-fixa num">Média</th>
                        <th className="col-fixa num">Menor</th>
                        <th className="col-fixa num">Maior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.tempos_por_processo.map((t) => (
                        <tr key={t.id_tipo_processo}>
                          <td className="col-quebra">{t.nome_tipo_processo}</td>
                          <td className="col-fixa num">{t.etapas}</td>
                          <td className="col-fixa num">
                            <strong>{formatarDuracao(t.media_minutos)}</strong>
                          </td>
                          <td className="col-fixa num">{formatarDuracao(t.menor_minutos)}</td>
                          <td className="col-fixa num">{formatarDuracao(t.maior_minutos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <h2>Solicitações</h2>
              {relatorio.solicitacoes.length === 0 ? (
                <p className="card__empty">Nenhuma solicitação encontrada com estes filtros.</p>
              ) : (
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th className="col-quebra">Peça</th>
                        <th className="col-fixa">Status</th>
                        <th className="col-fixa">Prioridade</th>
                        <th className="col-fixa">Abertura</th>
                        <th className="col-fixa">Prazo</th>
                        <th className="col-fixa">Conclusão</th>
                        <th>Situação do prazo</th>
                        <th>Solicitante</th>
                        <th>Operadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.solicitacoes.map((s) => (
                        <tr key={s.id_solicitacao}>
                          <td className="col-quebra">
                            <Link className="task-link" to={`/solicitacoes/${s.id_solicitacao}`}>
                              {tituloDaPeca(s)}
                            </Link>
                            {s.descricao?.trim() && <small className="tabela__apoio">Desenho: {s.numero_desenho}</small>}
                          </td>
                          <td className="col-fixa">{STATUS_SOLICITACAO_LABEL[s.status]}</td>
                          <td className="col-fixa">{PRIORIDADE_LABEL[s.prioridade]}</td>
                          <td className="col-fixa">{formatarData(s.data_abertura)}</td>
                          <td className="col-fixa">{formatarPrazo(s.data_prazo)}</td>
                          <td className="col-fixa">{formatarData(s.data_conclusao)}</td>
                          <td>{situacaoDoPrazo(s)}</td>
                          <td>{s.nome_solicitante}</td>
                          <td>{s.operadores ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
