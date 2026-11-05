import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IllustrationLogin } from '../components/Illustrations';
import '../styles/AuthLayout.css';

export default function LoginPage() {
  const { login, estaAutenticado } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Já logado (ex.: voltou pra /login com sessão válida) — manda pro destino original.
  if (estaAutenticado) {
    const destino = location.state?.from?.pathname || '/';
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email, senha, manterConectado);
      const destino = location.state?.from?.pathname || '/';
      navigate(destino, { replace: true });
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__form">
          <h1>Entrar</h1>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__icon" aria-hidden="true">
                👤
              </span>
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
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
                autoComplete="current-password"
                required
              />
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={manterConectado}
                onChange={(e) => setManterConectado(e.target.checked)}
              />
              Manter Conectado
            </label>

            {erro && <p className="field-error">{erro}</p>}

            <button type="submit" className="btn-primary" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Login'}
            </button>
          </form>

          <span className="auth-card__hint">
            Novos acessos são criados por um administrador do sistema.
          </span>
        </div>

        <div className="auth-card__illustration">
          <IllustrationLogin />
        </div>
      </div>
    </div>
  );
}
