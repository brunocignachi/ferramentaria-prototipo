import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import { IllustrationCadastro } from '../components/Illustrations';
import '../styles/AuthLayout.css';

// Repaginação da tela de "Registrar" do protótipo (Figura 1): como o
// backend não expõe auto-cadastro (POST /usuarios exige perfil
// administrador — ver usuarioRoutes.js), essa tela só fica acessível a um
// admin já logado, que cadastra outros usuários em nome do sistema.
export default function CadastrarUsuarioPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [perfil, setPerfil] = useState('solicitante');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);
    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: { nome, email, senha, perfil },
      });
      setSucesso(`Usuário "${nome}" cadastrado com sucesso.`);
      setNome('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
      setPerfil('solicitante');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="register-page">
        <div className="auth-card">
          <div className="auth-card__form">
            <h1>Cadastrar usuário</h1>
            <p className="auth-card__subtitle">
              Disponível apenas para administradores (RN03).
            </p>

            <form onSubmit={handleSubmit}>
              <label className="field">
                <span className="field__icon" aria-hidden="true">
                  👤
                </span>
                <input
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span className="field__icon" aria-hidden="true">
                  ✉️
                </span>
                <input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span className="field__icon" aria-hidden="true">
                  🔒
                </span>
                <input
                  type="password"
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  minLength={6}
                  required
                />
              </label>

              <label className="field">
                <span className="field__icon" aria-hidden="true">
                  🔒
                </span>
                <input
                  type="password"
                  placeholder="Confirmar Senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  minLength={6}
                  required
                />
              </label>

              <label className="select-field">
                Perfil de acesso
                <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                  <option value="solicitante">Solicitante</option>
                  <option value="operador">Operador</option>
                  <option value="administrador">Administrador</option>
                </select>
              </label>

              {erro && <p className="field-error">{erro}</p>}
              {sucesso && <p className="field-success">{sucesso}</p>}

              <button type="submit" className="btn-primary" disabled={enviando}>
                {enviando ? 'Cadastrando...' : 'Registrar'}
              </button>
            </form>

            <Link to="/" className="auth-card__hint">
              ← Voltar ao Dashboard
            </Link>
          </div>

          <div className="auth-card__illustration">
            <IllustrationCadastro />
          </div>
        </div>
      </main>
    </div>
  );
}
