import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IllustrationLogin } from '../components/Illustrations';
import CampoErro from '../components/CampoErro';
import { useValidacao } from '../hooks/useValidacao';
import Icone from '../components/Icone';
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

  const erros = { email: email.trim() ? '' : 'Informe o e-mail.', senha: senha ? '' : 'Informe a senha.' };
  const { erroDe, podeEnviar } = useValidacao(erros, { email, senha });

  // Já logado (ex.: voltou pra /login com sessão válida) — manda pro destino original.
  if (estaAutenticado) {
    const destino = location.state?.from?.pathname || '/';
    return <Navigate to={destino} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    if (!podeEnviar()) return;
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

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <Icone nome="email" className="field__icon" />
              <input
                type="email"
                placeholder="E-mail"
                value={email}
                aria-invalid={!!erroDe('email')}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <CampoErro mensagem={erroDe('email')} />

            <label className="field">
              <Icone nome="senha" className="field__icon" />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                aria-invalid={!!erroDe('senha')}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <CampoErro mensagem={erroDe('senha')} />

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
