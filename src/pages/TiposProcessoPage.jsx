import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

function CamposTipo({ campos, onAlterar }) {
  return (
    <div className="form-campos">
      <label>
        Nome
        <input value={campos.nome} onChange={(e) => onAlterar({ ...campos, nome: e.target.value })} required />
      </label>
      <label>
        Descrição (opcional)
        <input value={campos.descricao} onChange={(e) => onAlterar({ ...campos, descricao: e.target.value })} />
      </label>
    </div>
  );
}

// Cadastro dos tipos de processo produtivo (RF11, UC16, E11). Tipos saem de uso
// por desativação, porque as etapas já registradas continuam apontando para eles.
export default function TiposProcessoPage() {
  const [tipos, setTipos] = useState([]);
  const [novo, setNovo] = useState({ nome: '', descricao: '' });
  const [emEdicao, setEmEdicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setTipos(await apiRequest('/tipos-processo'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function executar(acao) {
    setOcupado(true);
    setErro('');
    try {
      await acao();
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function criar(event) {
    event.preventDefault();
    executar(async () => {
      await apiRequest('/tipos-processo', { method: 'POST', body: novo });
      setNovo({ nome: '', descricao: '' });
    });
  }

  function salvarEdicao(event) {
    event.preventDefault();
    const { id, ...campos } = emEdicao;
    executar(async () => {
      await apiRequest(`/tipos-processo/${id}`, { method: 'PATCH', body: campos });
      setEmEdicao(null);
    });
  }

  function alternarAtivo(tipo) {
    executar(() =>
      apiRequest(`/tipos-processo/${tipo.id_tipo_processo}`, { method: 'PATCH', body: { ativo: !tipo.ativo } })
    );
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">Tipos de processo</h1>
          <p className="page-subtitle">Processos disponíveis para montar o roteiro das peças.</p>
        </header>

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          <h2>Novo tipo de processo</h2>
          <form onSubmit={criar}>
            <CamposTipo campos={novo} onAlterar={setNovo} />
            <div className="form-acoes">
              <button type="submit" className="btn btn--primario" disabled={ocupado}>
                Adicionar tipo
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Cadastrados</h2>
          {carregando ? (
            <p className="card__empty">Carregando...</p>
          ) : tipos.length === 0 ? (
            <p className="card__empty">Nenhum tipo de processo cadastrado.</p>
          ) : (
            <ul className="linhas">
              {tipos.map((tipo) => (
                <li key={tipo.id_tipo_processo}>
                  {emEdicao?.id === tipo.id_tipo_processo ? (
                    <form className="linha-edicao" onSubmit={salvarEdicao}>
                      <CamposTipo campos={emEdicao} onAlterar={setEmEdicao} />
                      <div className="form-acoes">
                        <button type="submit" className="btn btn--primario" disabled={ocupado}>
                          Salvar alterações
                        </button>
                        <button type="button" className="btn" disabled={ocupado} onClick={() => setEmEdicao(null)}>
                          Voltar sem salvar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="linha">
                      <div className="linha__info">
                        <strong>{tipo.nome}</strong>
                        <small>{tipo.descricao || 'Sem descrição'}</small>
                      </div>
                      <span className={`badge ${tipo.ativo ? 'badge--concluida' : ''}`}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <div className="linha__acoes">
                        <button
                          type="button"
                          className="btn"
                          disabled={ocupado}
                          onClick={() =>
                            setEmEdicao({
                              id: tipo.id_tipo_processo,
                              nome: tipo.nome,
                              descricao: tipo.descricao ?? '',
                            })
                          }
                        >
                          Editar
                        </button>
                        <button type="button" className="btn" disabled={ocupado} onClick={() => alternarAtivo(tipo)}>
                          {tipo.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
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
