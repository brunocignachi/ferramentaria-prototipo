import { useState } from 'react';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import Icone from '../components/Icone';
import CampoErro from '../components/CampoErro';
import { useAuth } from '../context/AuthContext';
import { useValidacao } from '../hooks/useValidacao';
import { erroSenha } from '../utils/validacao';
import {
  escolherAvisosNaTela,
  escolherTema,
  lerAvisosNaTela,
  lerTema,
} from '../utils/preferencias';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const OPCOES_TEMA = [
  { valor: 'automatico', rotulo: 'Automático', detalhe: 'Segue o tema do aparelho', icone: 'automatico' },
  { valor: 'claro', rotulo: 'Claro', detalhe: 'Fundo claro', icone: 'sol' },
  { valor: 'escuro', rotulo: 'Escuro', detalhe: 'Modo noturno', icone: 'lua' },
];

const PERFIL_LABEL = { administrador: 'Administrador', solicitante: 'Solicitante', operador: 'Operador' };

const SENHA_VAZIA = { atual: '', nova: '', confirmacao: '' };

// O próprio usuário troca a senha, informando a atual.
function FormularioSenha() {
  const [campos, setCampos] = useState(SENHA_VAZIA);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);

  let erroConfirmacao = '';
  if (!campos.confirmacao) erroConfirmacao = 'Repita a nova senha.';
  else if (campos.confirmacao !== campos.nova) erroConfirmacao = 'As senhas não conferem.';

  const erros = {
    atual: campos.atual ? '' : 'Informe a senha atual.',
    nova: erroSenha(campos.nova) || (campos.nova === campos.atual ? 'A nova senha deve ser diferente da atual.' : ''),
    confirmacao: erroConfirmacao,
  };
  const { erroDe, podeEnviar, reiniciar } = useValidacao(erros, campos);
  const alterar = (campo, valor) => setCampos((atuais) => ({ ...atuais, [campo]: valor }));

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setSucesso('');
    if (!podeEnviar()) return;
    setEnviando(true);
    try {
      await apiRequest('/auth/senha', {
        method: 'PATCH',
        body: { senha_atual: campos.atual, senha_nova: campos.nova },
      });
      setSucesso('Senha alterada. Use a nova senha no próximo login.');
      setCampos(SENHA_VAZIA);
      reiniciar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-campos">
        <label>
          Senha atual
          <input
            type="password"
            autoComplete="current-password"
            value={campos.atual}
            aria-invalid={!!erroDe('atual')}
            onChange={(e) => alterar('atual', e.target.value)}
          />
          <CampoErro mensagem={erroDe('atual')} />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            autoComplete="new-password"
            value={campos.nova}
            aria-invalid={!!erroDe('nova')}
            onChange={(e) => alterar('nova', e.target.value)}
          />
          <CampoErro mensagem={erroDe('nova')} />
        </label>
        <label>
          Confirmar nova senha
          <input
            type="password"
            autoComplete="new-password"
            value={campos.confirmacao}
            aria-invalid={!!erroDe('confirmacao')}
            onChange={(e) => alterar('confirmacao', e.target.value)}
          />
          <CampoErro mensagem={erroDe('confirmacao')} />
        </label>
      </div>

      {erro && <p className="field-error">{erro}</p>}
      {sucesso && <p className="field-success">{sucesso}</p>}

      <div className="form-acoes">
        <button type="submit" className="btn btn--primario" disabled={enviando}>
          {enviando ? 'Salvando...' : 'Salvar nova senha'}
        </button>
      </div>
    </form>
  );
}

// Preferências deste aparelho: tema e avisos na tela.
export default function ConfiguracoesPage() {
  const { usuario } = useAuth();
  const [tema, setTema] = useState(lerTema);
  const [avisosNaTela, setAvisosNaTela] = useState(lerAvisosNaTela);

  function trocarTema(novo) {
    escolherTema(novo);
    setTema(novo);
  }

  function trocarAvisos(ativo) {
    escolherAvisosNaTela(ativo);
    setAvisosNaTela(ativo);
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">As preferências valem para este navegador.</p>
        </header>

        <section className="card">
          <h2>Aparência</h2>
          <div className="opcoes-tema" role="radiogroup" aria-label="Tema">
            {OPCOES_TEMA.map((opcao) => (
              <label key={opcao.valor} className={`opcao-tema ${tema === opcao.valor ? 'is-ativa' : ''}`}>
                <input
                  type="radio"
                  name="tema"
                  value={opcao.valor}
                  checked={tema === opcao.valor}
                  onChange={() => trocarTema(opcao.valor)}
                />
                <Icone nome={opcao.icone} />
                <span className="opcao-tema__texto">
                  <strong>{opcao.rotulo}</strong>
                  <small>{opcao.detalhe}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Notificações</h2>
          <label className="interruptor">
            <input
              type="checkbox"
              role="switch"
              checked={avisosNaTela}
              onChange={(e) => trocarAvisos(e.target.checked)}
            />
            <span className="interruptor__trilho" aria-hidden="true" />
            <span className="interruptor__texto">
              <strong>Mostrar aviso na tela</strong>
              <small>Exibe um aviso quando chega uma notificação com o site aberto. O sino do menu continua contando.</small>
            </span>
          </label>
        </section>

        <section className="card">
          <h2>Conta</h2>
          <dl className="detalhe__dados">
            <div>
              <dt>Nome</dt>
              <dd>{usuario?.nome}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{usuario?.email}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{PERFIL_LABEL[usuario?.perfil] ?? usuario?.perfil}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>Trocar senha</h2>
          <FormularioSenha />
        </section>
      </main>
    </div>
  );
}
