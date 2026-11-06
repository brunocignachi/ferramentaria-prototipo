import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const PERFIL_LABEL = { administrador: 'Administrador', solicitante: 'Solicitante', operador: 'Operador' };

function FormularioUsuario({ alvo, ehProprio, onSalvo, onCancelar }) {
  const [campos, setCampos] = useState({ nome: alvo.nome, email: alvo.email, perfil: alvo.perfil, senha: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, valor) => setCampos((atuais) => ({ ...atuais, [campo]: valor }));

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const { senha, ...dados } = campos;
      await apiRequest(`/usuarios/${alvo.id_usuario}`, {
        method: 'PATCH',
        body: senha ? { ...dados, senha } : dados,
      });
      await onSalvo();
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <form className="linha-edicao" onSubmit={handleSubmit}>
      <div className="form-campos">
        <label>
          Nome
          <input value={campos.nome} onChange={(e) => alterar('nome', e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={campos.email} onChange={(e) => alterar('email', e.target.value)} required />
        </label>
        <label>
          Perfil
          <select value={campos.perfil} disabled={ehProprio} onChange={(e) => alterar('perfil', e.target.value)}>
            {Object.entries(PERFIL_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nova senha (opcional)
          <input
            type="password"
            minLength={6}
            autoComplete="new-password"
            value={campos.senha}
            onChange={(e) => alterar('senha', e.target.value)}
          />
        </label>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      <div className="form-acoes">
        <button type="submit" className="btn btn--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="btn" disabled={enviando} onClick={onCancelar}>
          Voltar sem salvar
        </button>
      </div>
    </form>
  );
}

// Gestão de usuários e perfis de acesso (RF10, UC15, E12, RN03).
export default function UsuariosPage() {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [idEmEdicao, setIdEmEdicao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setUsuarios(await apiRequest('/usuarios'));
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

  async function alternarAtivo(alvo) {
    try {
      await apiRequest(`/usuarios/${alvo.id_usuario}`, { method: 'PATCH', body: { ativo: !alvo.ativo } });
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(alvo) {
    if (!window.confirm(`Excluir permanentemente o usuário "${alvo.nome}"?`)) return;
    try {
      await apiRequest(`/usuarios/${alvo.id_usuario}`, { method: 'DELETE' });
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header className="detalhe__cabecalho">
          <div>
            <h1 className="page-title">Usuários</h1>
            <p className="page-subtitle">
              Quem tem registros no sistema é desativado em vez de excluído, para manter a rastreabilidade.
            </p>
          </div>
          <Link to="/usuarios/novo" className="btn btn--primario btn--link">
            Cadastrar usuário
          </Link>
        </header>

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          {carregando ? (
            <p className="card__empty">Carregando...</p>
          ) : (
            <ul className="linhas">
              {usuarios.map((alvo) => {
                const ehProprio = alvo.id_usuario === usuario?.id;
                return (
                  <li key={alvo.id_usuario}>
                    {idEmEdicao === alvo.id_usuario ? (
                      <FormularioUsuario
                        alvo={alvo}
                        ehProprio={ehProprio}
                        onCancelar={() => setIdEmEdicao(null)}
                        onSalvo={async () => {
                          await carregar();
                          setIdEmEdicao(null);
                        }}
                      />
                    ) : (
                      <div className="linha">
                        <div className="linha__info">
                          <strong>
                            {alvo.nome}
                            {ehProprio ? ' (você)' : ''}
                          </strong>
                          <small>
                            {alvo.email} · {PERFIL_LABEL[alvo.perfil]}
                          </small>
                        </div>
                        <span className={`badge ${alvo.ativo ? 'badge--concluida' : ''}`}>
                          {alvo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <div className="linha__acoes">
                          <button type="button" className="btn" onClick={() => setIdEmEdicao(alvo.id_usuario)}>
                            Editar
                          </button>
                          {!ehProprio && (
                            <>
                              <button type="button" className="btn" onClick={() => alternarAtivo(alvo)}>
                                {alvo.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                              <button type="button" className="btn btn--perigo" onClick={() => excluir(alvo)}>
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
