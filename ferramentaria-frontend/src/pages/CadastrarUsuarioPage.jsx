import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import CampoErro from '../components/CampoErro';
import { IllustrationCadastro } from '../components/Illustrations';
import { useValidacao } from '../hooks/useValidacao';
import { LIMITES, erroEmail, erroSenha, erroTexto } from '../utils/validacao';
import Icone from '../components/Icone';
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

  let erroConfirmacao = '';
  if (!confirmarSenha) erroConfirmacao = 'Repita a senha.';
  else if (confirmarSenha !== senha) erroConfirmacao = 'As senhas não conferem.';

  const erros = {
    nome: erroTexto(nome, { rotulo: 'Nome', max: LIMITES.nomeUsuario, obrigatorio: true }),
    email: erroEmail(email),
    senha: erroSenha(senha),
    confirmarSenha: erroConfirmacao,
  };
  const { erroDe, podeEnviar, reiniciar } = useValidacao(erros, { nome, email, senha, confirmarSenha });

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    if (!podeEnviar()) return;

    setEnviando(true);
    try {
      await apiRequest('/usuarios', {
        method: 'POST',
        body: { nome, email, senha, perfil },
      });
      setSucesso(`Usuário "${nome.trim()}" cadastrado com sucesso.`);
      setNome('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
      setPerfil('solicitante');
      reiniciar();
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
              Disponível apenas para administradores.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <label className="field">
                <Icone nome="usuario" className="field__icon" />
                <input
                  placeholder="Nome"
                  aria-label="Nome"
                  value={nome}
                  aria-invalid={!!erroDe('nome')}
                  onChange={(e) => setNome(e.target.value)}
                />
              </label>
              <CampoErro mensagem={erroDe('nome')} />

              <label className="field">
                <Icone nome="email" className="field__icon" />
                <input
                  type="email"
                  placeholder="E-mail"
                  aria-label="E-mail"
                  value={email}
                  aria-invalid={!!erroDe('email')}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <CampoErro mensagem={erroDe('email')} />

              <label className="field">
                <Icone nome="senha" className="field__icon" />
                <input
                  type="password"
                  placeholder="Senha"
                  aria-label="Senha"
                  autoComplete="new-password"
                  value={senha}
                  aria-invalid={!!erroDe('senha')}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </label>
              <CampoErro mensagem={erroDe('senha')} />

              <label className="field">
                <Icone nome="senha" className="field__icon" />
                <input
                  type="password"
                  placeholder="Confirmar Senha"
                  aria-label="Confirmar senha"
                  autoComplete="new-password"
                  value={confirmarSenha}
                  aria-invalid={!!erroDe('confirmarSenha')}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </label>
              <CampoErro mensagem={erroDe('confirmarSenha')} />

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

            <Link to="/usuarios" className="auth-card__hint">
              ← Voltar aos usuários
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
