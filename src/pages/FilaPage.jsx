import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import {
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  STATUS_ETAPA_LABEL,
  formatarPrazo,
  podeAtuarNaEtapa,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Painel de tarefas prioritárias por processo/máquina (RF07, UC09, UC12). A API
// já entrega a fila ordenada (RF06, RN02) e só com a etapa da vez de cada peça.
export default function FilaPage() {
  const { usuario } = useAuth();
  const [etapas, setEtapas] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [idTipo, setIdTipo] = useState('');
  const [apenasMinhas, setApenasMinhas] = useState(usuario?.perfil === 'operador');
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(null);
  const [erro, setErro] = useState('');

  const carregarFila = useCallback(async () => {
    setCarregando(true);
    try {
      const filtro = idTipo ? `?id_tipo_processo=${idTipo}` : '';
      setEtapas(await apiRequest(`/processos/fila${filtro}`));
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [idTipo]);

  useEffect(() => {
    carregarFila();
  }, [carregarFila]);

  useEffect(() => {
    apiRequest('/tipos-processo')
      .then(setTipos)
      .catch((err) => setErro(err.message));
  }, []);

  const visiveis = useMemo(
    () => (apenasMinhas ? etapas.filter((etapa) => etapa.id_operador === usuario?.id) : etapas),
    [etapas, apenasMinhas, usuario]
  );

  async function atualizarEtapa(idProcesso, acao) {
    setProcessando(idProcesso);
    setErro('');
    try {
      await apiRequest(`/processos/${idProcesso}/${acao}`, { method: 'PATCH' });
    } catch (err) {
      setErro(err.message);
    }
    await carregarFila();
    setProcessando(null);
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">Tarefas</h1>
          <p className="page-subtitle">Fila por prioridade e prazo, com a etapa da vez de cada peça.</p>
        </header>

        <div className="page-filters">
          <select aria-label="Processo" value={idTipo} onChange={(e) => setIdTipo(e.target.value)}>
            <option value="">Todos os processos</option>
            {tipos.map((tipo) => (
              <option key={tipo.id_tipo_processo} value={tipo.id_tipo_processo}>
                {tipo.nome}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={apenasMinhas}
              onChange={(e) => setApenasMinhas(e.target.checked)}
            />
            Apenas minhas etapas
          </label>
        </div>

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          {carregando && visiveis.length === 0 ? (
            <p className="card__empty">Carregando...</p>
          ) : visiveis.length === 0 ? (
            <p className="card__empty">Nenhuma etapa aguardando nesta fila.</p>
          ) : (
            <ul className="task-list">
              {visiveis.map((etapa) => (
                <li key={etapa.id_processo} className="task-list__item task-list__item--acoes">
                  <div className="task-list__main">
                    <span className="task-list__dot" style={{ background: PRIORIDADE_COR[etapa.prioridade] }} />
                    <div className="task-list__body">
                      <strong>
                        <Link className="task-link" to={`/solicitacoes/${etapa.id_solicitacao}`}>
                          {etapa.numero_desenho}
                        </Link>
                      </strong>
                      <span>
                        Etapa {etapa.ordem_execucao}: {etapa.nome_tipo_processo} · {STATUS_ETAPA_LABEL[etapa.status]}
                      </span>
                      <small>
                        Prioridade: {PRIORIDADE_LABEL[etapa.prioridade]} · Prazo: {formatarPrazo(etapa.data_prazo)} ·
                        Operador: {etapa.nome_operador ?? 'não atribuído'}
                      </small>
                    </div>
                  </div>

                  {etapa.status === 'pendente' && etapa.id_operador && podeAtuarNaEtapa(usuario, etapa) && (
                    <button
                      type="button"
                      className="btn btn--primario"
                      disabled={processando === etapa.id_processo}
                      onClick={() => atualizarEtapa(etapa.id_processo, 'iniciar')}
                    >
                      Iniciar
                    </button>
                  )}
                  {etapa.status === 'em_andamento' && podeAtuarNaEtapa(usuario, etapa) && (
                    <button
                      type="button"
                      className="btn btn--primario"
                      disabled={processando === etapa.id_processo}
                      onClick={() => atualizarEtapa(etapa.id_processo, 'concluir')}
                    >
                      Concluir
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
